using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Application;

public sealed class ScheduleService(IScheduleRepository repository) : IScheduleService
{
    public async Task<IReadOnlyList<ScheduleSummaryDto>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct) =>
        (await repository.ListAsync(facultyCode, academicYear, ct)).Select(MapSummary).ToList();

    public async Task<IReadOnlyList<ScheduleSummaryDto>> ListPublishedAsync(string? facultyCode, string? academicYear, CancellationToken ct) =>
        (await repository.ListAsync(facultyCode, academicYear, ct)).Where(x => x.Status == ScheduleStatus.Published).Select(MapSummary).ToList();

    public async Task<ScheduleDto> GetAsync(Guid id, CancellationToken ct) =>
        Map(await repository.GetAsync(id, false, ct) ?? throw new NotFoundException("Plan nie istnieje."));

    public async Task<ScheduleDto> GetPublishedAsync(Guid id, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(id, false, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        if (schedule.Status != ScheduleStatus.Published) throw new NotFoundException("Opublikowany plan nie istnieje.");
        return Map(schedule);
    }

    public async Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, CurrentUser user, CancellationToken ct)
    {
        ValidatePlan(request.AcademicYear, request.SemesterNumber, request.Name);
        var faculty = await repository.FindFacultyAsync(request.FacultyCode.Trim().ToUpperInvariant(), ct)
            ?? throw new ValidationException("Nieznany wydział.");
        var now = DateTimeOffset.UtcNow;
        var schedule = new SchedulePlan
        {
            Id = Guid.NewGuid(), FacultyId = faculty.Id, Faculty = faculty,
            AcademicYear = request.AcademicYear.Trim(), SemesterNumber = request.SemesterNumber,
            StudyMode = request.StudyMode, Name = request.Name.Trim(), Status = ScheduleStatus.Draft,
            ConcurrencyToken = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now,
            CreatedBy = user.Email, CreatedByUserId = user.UserId, UpdatedBy = user.Email, UpdatedByUserId = user.UserId,
        };
        var group = NewGroup(schedule.Id, "G1", "Gr. 1", 0, user, now);
        schedule.Groups.Add(group);
        await repository.AddAsync(schedule, ct);
        try { await repository.SaveChangesAsync(ct); }
        catch (Exception ex) when (ex.GetType().Name.Contains("DbUpdate")) { throw new ConflictException("Plan dla wybranego semestru i trybu już istnieje."); }
        return Map(schedule);
    }

    public async Task<ScheduleDto> SaveAsync(Guid id, SaveScheduleRequest request, CurrentUser user, CancellationToken ct)
    {
        var scheduleReference = await repository.GetAsync(id, false, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        await using var scheduleLock = await repository.LockFacultyAsync(scheduleReference.FacultyId, ct);
        var schedule = await repository.GetAsync(id, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        if (schedule.ConcurrencyToken != request.ConcurrencyToken) throw new ConflictException("Plan został zmieniony przez innego użytkownika.");
        ValidatePayload(request);
        var now = DateTimeOffset.UtcNow;
        var requestedGroupIds = request.Groups.Select(x => x.Id).ToHashSet();
        schedule.Groups.RemoveAll(x => !requestedGroupIds.Contains(x.Id));
        foreach (var dto in request.Groups)
        {
            var group = schedule.Groups.FirstOrDefault(x => x.Id == dto.Id);
            if (group is null)
            {
                group = NewGroup(id, dto.Code, dto.Name, dto.SortOrder, user, now);
                group.Id = dto.Id;
                schedule.Groups.Add(group);
                await repository.AddGroupAsync(group, ct);
            }
            else { group.Code = dto.Code.Trim().ToUpperInvariant(); group.Name = dto.Name.Trim(); group.SortOrder = dto.SortOrder; group.UpdatedAt = now; group.UpdatedBy = user.Email; group.UpdatedByUserId = user.UserId; group.ConcurrencyToken = Guid.NewGuid(); }
        }
        var requestedEntryIds = request.Entries.Select(x => x.Id).ToHashSet();
        schedule.Entries.RemoveAll(x => !requestedEntryIds.Contains(x.Id));
        foreach (var dto in request.Entries)
        {
            var entry = schedule.Entries.FirstOrDefault(x => x.Id == dto.Id);
            if (entry is null)
            {
                entry = new ScheduleEntry { Id = dto.Id, ScheduleId = id, CreatedAt = now, CreatedBy = user.Email, CreatedByUserId = user.UserId };
                schedule.Entries.Add(entry);
                await repository.AddEntryAsync(entry, ct);
            }
            Apply(entry, dto, user, now);
            var desiredGroupIds = dto.GroupIds.Distinct().ToHashSet();
            entry.EntryGroups.RemoveAll(x => !desiredGroupIds.Contains(x.StudentGroupId));
            var existingGroupIds = entry.EntryGroups.Select(x => x.StudentGroupId).ToHashSet();
            foreach (var groupId in desiredGroupIds.Where(x => !existingGroupIds.Contains(x)))
            {
                var group = schedule.Groups.Single(x => x.Id == groupId);
                entry.EntryGroups.Add(new ScheduleEntryGroup
                {
                    ScheduleEntryId = entry.Id,
                    ScheduleEntry = entry,
                    StudentGroupId = groupId,
                    StudentGroup = group,
                });
            }
        }
        ValidateOverlaps(request.Entries);
        schedule.Name = request.Name.Trim();
        if (request.Status == ScheduleStatus.Published)
        {
            var previouslyPublished = await repository.ListPublishedForSelectionAsync(schedule.FacultyId, schedule.AcademicYear, schedule.SemesterNumber, schedule.StudyMode, schedule.Id, ct);
            foreach (var previous in previouslyPublished)
            {
                previous.Status = ScheduleStatus.Draft;
                previous.UpdatedAt = now;
                previous.UpdatedBy = user.Email;
                previous.UpdatedByUserId = user.UserId;
                previous.ConcurrencyToken = Guid.NewGuid();
            }
        }
        schedule.Status = request.Status;
        schedule.UpdatedAt = now; schedule.UpdatedBy = user.Email; schedule.UpdatedByUserId = user.UserId; schedule.ConcurrencyToken = Guid.NewGuid();
        await repository.SaveChangesAsync(ct);
        await scheduleLock.CompleteAsync(ct);
        return Map(schedule);
    }

    public async Task DeleteAsync(Guid id, DeleteScheduleRequest request, CancellationToken ct)
    {
        await using var scheduleLock = await repository.LockScheduleAsync(id, ct);
        var schedule = await repository.GetAsync(id, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        if (schedule.ConcurrencyToken != request.ConcurrencyToken) throw new ConflictException("Plan został zmieniony przez innego użytkownika.");
        await repository.DeleteAsync(schedule, ct); await repository.SaveChangesAsync(ct); await scheduleLock.CompleteAsync(ct);
    }

    public async Task<IReadOnlyList<CommentDto>> ListCommentsAsync(Guid entryId, CurrentUser user, CancellationToken ct)
    {
        var entry = await repository.GetEntryAsync(entryId, ct) ?? throw new NotFoundException("Bloczek nie istnieje.");
        EnsureCommentable(entry.Schedule, user);
        return entry.Comments.Where(x => x.DeletedAt is null).OrderBy(x => x.CreatedAt).Select(x => MapComment(x, user)).ToList();
    }

    public async Task<CommentDto> AddCommentAsync(Guid entryId, AddCommentRequest request, CurrentUser user, CancellationToken ct)
    {
        var body = Required(request.Body, "Komentarz");
        var entry = await repository.GetEntryAsync(entryId, ct) ?? throw new NotFoundException("Bloczek nie istnieje.");
        EnsureCommentable(entry.Schedule, user);
        var comment = new ScheduleComment { Id = Guid.NewGuid(), ScheduleEntryId = entryId, Body = body, AuthorUserId = user.UserId, AuthorEmail = user.Email, AuthorDisplayName = user.DisplayName, AuthorRole = user.Role, CreatedAt = DateTimeOffset.UtcNow };
        await repository.AddCommentAsync(comment, ct);
        await repository.SaveChangesAsync(ct);
        return MapComment(comment, user);
    }

    public async Task<CommentDto> EditCommentAsync(Guid id, EditCommentRequest request, CurrentUser user, CancellationToken ct)
    {
        var comment = await repository.GetCommentAsync(id, ct) ?? throw new NotFoundException("Komentarz nie istnieje.");
        EnsureCommentable(comment.ScheduleEntry.Schedule, user);
        if (!string.Equals(comment.AuthorUserId, user.UserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Można edytować tylko własny komentarz.");
        comment.Body = Required(request.Body, "Komentarz"); comment.UpdatedAt = DateTimeOffset.UtcNow;
        await repository.SaveChangesAsync(ct); return MapComment(comment, user);
    }

    public async Task DeleteCommentAsync(Guid id, CurrentUser user, CancellationToken ct)
    {
        var comment = await repository.GetCommentAsync(id, ct) ?? throw new NotFoundException("Komentarz nie istnieje.");
        EnsureCommentable(comment.ScheduleEntry.Schedule, user);
        if (!user.IsAdmin && !string.Equals(comment.AuthorUserId, user.UserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Brak uprawnień do usunięcia komentarza.");
        comment.DeletedAt = DateTimeOffset.UtcNow; comment.DeletedBy = user.Email; comment.DeletedByUserId = user.UserId; await repository.SaveChangesAsync(ct);
    }

    private static void EnsureCommentable(SchedulePlan schedule, CurrentUser user)
    {
        if (schedule.Status != ScheduleStatus.Published && user.Role is not ("planner" or "admin"))
            throw new UnauthorizedAccessException("Komentarze do wersji roboczej są dostępne tylko dla planistów.");
    }

    private static void ValidatePlan(string year, int semester, string name)
    {
        var normalizedYear = year?.Trim() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(normalizedYear, @"^\d{4}/\d{4}$")) throw new ValidationException("Nieprawidłowy rok akademicki.");
        var parts = normalizedYear.Split('/'); if (int.Parse(parts[1]) != int.Parse(parts[0]) + 1) throw new ValidationException("Rok akademicki musi obejmować kolejne lata.");
        if (semester is < 1 or > 8) throw new ValidationException("Numer semestru musi być w zakresie 1-8.");
        Required(name, "Nazwa planu");
    }

    private static void ValidatePayload(SaveScheduleRequest request)
    {
        Required(request.Name, "Nazwa planu");
        if (request.Groups.Count == 0) throw new ValidationException("Plan musi zawierać co najmniej jedną grupę.");
        if (request.Groups.Select(x => x.Id).Distinct().Count() != request.Groups.Count || request.Groups.Select(x => x.Code.Trim().ToUpperInvariant()).Distinct().Count() != request.Groups.Count) throw new ValidationException("Grupy muszą mieć unikalne identyfikatory i kody.");
        var groups = request.Groups.Select(x => x.Id).ToHashSet();
        foreach (var e in request.Entries)
        {
            Required(e.SubjectName, "Przedmiot");
            if (!string.IsNullOrWhiteSpace(e.LecturerEmail) && !e.LecturerEmail.Contains('@')) throw new ValidationException("Nieprawidłowy e-mail wykładowcy.");
            if (e.DayOfWeek is < 0 or > 6 || e.StartMinute < 480 || e.StartMinute + e.DurationMinutes > 1200 || e.DurationMinutes <= 0 || e.StartMinute % 15 != 0 || e.DurationMinutes % 15 != 0) throw new ValidationException("Nieprawidłowy termin bloczka.");
            if (e.GroupIds.Count == 0 || e.GroupIds.Any(x => !groups.Contains(x))) throw new ValidationException("Bloczek musi wskazywać grupy z tego planu.");
            if (e.Color is not null && !System.Text.RegularExpressions.Regex.IsMatch(e.Color, "^#[0-9a-fA-F]{6}$")) throw new ValidationException("Nieprawidłowy kolor bloczka.");
        }
    }

    private static void ValidateOverlaps(IReadOnlyList<SaveEntryRequest> entries)
    {
        for (var i = 0; i < entries.Count; i++) for (var j = i + 1; j < entries.Count; j++)
        {
            var a = entries[i]; var b = entries[j];
            if (a.DayOfWeek == b.DayOfWeek && a.GroupIds.Intersect(b.GroupIds).Any() && a.StartMinute < b.StartMinute + b.DurationMinutes && b.StartMinute < a.StartMinute + a.DurationMinutes)
                throw new ValidationException("Dwa bloczki nakładają się dla tej samej grupy.");
        }
    }

    private static StudentGroup NewGroup(Guid scheduleId, string code, string name, int order, CurrentUser actor, DateTimeOffset now) => new() { Id = Guid.NewGuid(), ScheduleId = scheduleId, Code = code.Trim().ToUpperInvariant(), Name = name.Trim(), SortOrder = order, ConcurrencyToken = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now, CreatedBy = actor.Email, CreatedByUserId = actor.UserId, UpdatedBy = actor.Email, UpdatedByUserId = actor.UserId };
    private static void Apply(ScheduleEntry e, SaveEntryRequest d, CurrentUser actor, DateTimeOffset now) { e.SubjectSource = d.SubjectSource?.Trim(); e.SubjectExternalId = d.SubjectExternalId?.Trim(); e.SubjectCode = d.SubjectCode?.Trim(); e.SubjectName = d.SubjectName.Trim(); e.ClassType = d.ClassType; e.LecturerUserId = string.IsNullOrWhiteSpace(d.LecturerUserId) ? null : d.LecturerUserId.Trim(); e.LecturerEmail = string.IsNullOrWhiteSpace(d.LecturerEmail) ? null : d.LecturerEmail.Trim().ToLowerInvariant(); e.LecturerDisplayName = d.LecturerDisplayName?.Trim() ?? ""; e.Room = string.IsNullOrWhiteSpace(d.Room) ? null : d.Room.Trim(); e.DayOfWeek = d.DayOfWeek; e.StartMinute = d.StartMinute; e.DurationMinutes = d.DurationMinutes; e.Color = d.Color; e.UpdatedAt = now; e.UpdatedBy = actor.Email; e.UpdatedByUserId = actor.UserId; e.ConcurrencyToken = Guid.NewGuid(); }
    private static string Required(string? value, string field) => !string.IsNullOrWhiteSpace(value) ? value.Trim() : throw new ValidationException($"{field} jest wymagane.");
    private static ScheduleSummaryDto MapSummary(SchedulePlan x) => new(x.Id, x.Faculty.Code, x.Faculty.Name, x.AcademicYear, x.SemesterNumber, x.StudyMode, x.Name, x.Status, x.ConcurrencyToken, x.UpdatedAt, x.UpdatedBy);
    private static ScheduleDto Map(SchedulePlan x) => new(x.Id, x.Faculty.Code, x.Faculty.Name, x.AcademicYear, x.SemesterNumber, x.StudyMode, x.Name, x.Status, x.ConcurrencyToken, x.UpdatedAt, x.UpdatedBy, x.Groups.OrderBy(g => g.SortOrder).Select(g => new GroupDto(g.Id, g.Code, g.Name, g.SortOrder, g.ConcurrencyToken)).ToList(), x.Entries.Select(e => new EntryDto(e.Id, e.SubjectSource, e.SubjectExternalId, e.SubjectCode, e.SubjectName, e.ClassType, e.LecturerUserId, e.LecturerEmail, e.LecturerDisplayName, e.Room, e.DayOfWeek, e.StartMinute, e.DurationMinutes, e.Color, e.EntryGroups.Select(g => g.StudentGroupId).ToList(), e.ConcurrencyToken, e.Comments.Count(c => c.DeletedAt == null))).ToList());
    private static CommentDto MapComment(ScheduleComment x, CurrentUser user) => new(x.Id, x.ScheduleEntryId, x.Body, x.AuthorUserId, x.AuthorEmail, x.AuthorDisplayName, x.AuthorRole, x.CreatedAt, x.UpdatedAt, string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal), user.IsAdmin || string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal));
}
