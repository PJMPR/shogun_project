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
        return Map(schedule, publishedView: true);
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

    public async Task<ScheduleSubjectDto> AddSubjectAsync(Guid scheduleId, SaveScheduleSubjectRequest request, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var (code, name) = ValidateSubject(request);
        if (schedule.Subjects.Any(x => string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase))) throw new ConflictException("Przedmiot o tym kodzie już istnieje w planie.");
        var now = DateTimeOffset.UtcNow;
        var subject = new ScheduleSubject { Id = Guid.NewGuid(), ScheduleId = scheduleId, Schedule = schedule, Code = code, Name = name, CreatedAt = now, UpdatedAt = now, CreatedBy = user.Email, CreatedByUserId = user.UserId, UpdatedBy = user.Email, UpdatedByUserId = user.UserId };
        schedule.Subjects.Add(subject); await repository.AddSubjectAsync(subject, ct); await repository.SaveChangesAsync(ct); return MapSubject(subject);
    }

    public async Task<ScheduleSubjectDto> UpdateSubjectAsync(Guid scheduleId, Guid subjectId, SaveScheduleSubjectRequest request, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var subject = schedule.Subjects.FirstOrDefault(x => x.Id == subjectId) ?? throw new NotFoundException("Przedmiot nie istnieje.");
        var (code, name) = ValidateSubject(request);
        if (schedule.Subjects.Any(x => x.Id != subjectId && string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase))) throw new ConflictException("Przedmiot o tym kodzie już istnieje w planie.");
        subject.Code = code; subject.Name = name; subject.UpdatedAt = DateTimeOffset.UtcNow; subject.UpdatedBy = user.Email; subject.UpdatedByUserId = user.UserId;
        await repository.SaveChangesAsync(ct); return MapSubject(subject);
    }

    public async Task DeleteSubjectAsync(Guid scheduleId, Guid subjectId, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var subject = schedule.Subjects.FirstOrDefault(x => x.Id == subjectId) ?? throw new NotFoundException("Przedmiot nie istnieje.");
        schedule.Subjects.Remove(subject); await repository.SaveChangesAsync(ct);
    }

    public async Task<ScheduleLecturerDto> AddLecturerAsync(Guid scheduleId, SaveScheduleLecturerRequest request, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var (name, email) = ValidateLecturer(request);
        EnsureUniqueLecturer(schedule, name, email);
        var now = DateTimeOffset.UtcNow;
        var lecturer = new ScheduleLecturer { Id = Guid.NewGuid(), ScheduleId = scheduleId, Schedule = schedule, DisplayName = name, Email = email, CreatedAt = now, UpdatedAt = now, CreatedBy = user.Email, CreatedByUserId = user.UserId, UpdatedBy = user.Email, UpdatedByUserId = user.UserId };
        schedule.Lecturers.Add(lecturer); await repository.AddLecturerAsync(lecturer, ct); await repository.SaveChangesAsync(ct); return MapLecturer(lecturer);
    }

    public async Task<ScheduleLecturerDto> UpdateLecturerAsync(Guid scheduleId, Guid lecturerId, SaveScheduleLecturerRequest request, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var lecturer = schedule.Lecturers.FirstOrDefault(x => x.Id == lecturerId) ?? throw new NotFoundException("Wykładowca nie istnieje.");
        var (name, email) = ValidateLecturer(request); EnsureUniqueLecturer(schedule, name, email, lecturerId);
        lecturer.DisplayName = name; lecturer.Email = email; lecturer.UpdatedAt = DateTimeOffset.UtcNow; lecturer.UpdatedBy = user.Email; lecturer.UpdatedByUserId = user.UserId;
        await repository.SaveChangesAsync(ct); return MapLecturer(lecturer);
    }

    public async Task DeleteLecturerAsync(Guid scheduleId, Guid lecturerId, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var lecturer = schedule.Lecturers.FirstOrDefault(x => x.Id == lecturerId) ?? throw new NotFoundException("Wykładowca nie istnieje.");
        var normalizedName = lecturer.DisplayName.Trim().ToLowerInvariant();
        var normalizedEmail = lecturer.Email?.Trim().ToLowerInvariant();
        bool Matches(string displayName, string? email) =>
            displayName.Trim().ToLowerInvariant() == normalizedName ||
            (normalizedEmail is not null && email?.Trim().ToLowerInvariant() == normalizedEmail);
        if (schedule.SubjectLecturers.Any(x => Matches(x.LecturerDisplayName, x.LecturerEmail)) ||
            schedule.Entries.Any(x => Matches(x.LecturerDisplayName, x.LecturerEmail)))
            throw new ConflictException("Nie można usunąć wykładowcy przypisanego do zajęć.");
        schedule.Lecturers.Remove(lecturer); await repository.SaveChangesAsync(ct);
    }

    public async Task<ScheduleSubjectLecturerDto> AddSubjectLecturerAsync(Guid scheduleId, AddScheduleSubjectLecturerRequest request, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var subjectCode = Required(request.SubjectCode, "Kod przedmiotu").ToUpperInvariant();
        var lecturerKey = Required(request.LecturerKey, "Identyfikator wykładowcy").ToLowerInvariant();
        if (schedule.SubjectLecturers.Any(x => x.SubjectCode == subjectCode && x.LecturerKey == lecturerKey)) throw new ConflictException("Wykładowca jest już przypisany do tego przedmiotu.");
        var item = new ScheduleSubjectLecturer { Id = Guid.NewGuid(), ScheduleId = scheduleId, Schedule = schedule, SubjectCode = subjectCode, LecturerKey = lecturerKey, LecturerDisplayName = Required(request.LecturerDisplayName, "Wykładowca"), LecturerUserId = string.IsNullOrWhiteSpace(request.LecturerUserId) ? null : request.LecturerUserId.Trim(), LecturerEmail = string.IsNullOrWhiteSpace(request.LecturerEmail) ? null : request.LecturerEmail.Trim().ToLowerInvariant(), LecturerAssignmentId = request.LecturerAssignmentId, CreatedAt = DateTimeOffset.UtcNow, CreatedBy = user.Email, CreatedByUserId = user.UserId };
        schedule.SubjectLecturers.Add(item); await repository.AddSubjectLecturerAsync(item, ct); await repository.SaveChangesAsync(ct); return MapSubjectLecturer(item);
    }

    public async Task DeleteSubjectLecturerAsync(Guid scheduleId, Guid assignmentId, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, true, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var item = schedule.SubjectLecturers.FirstOrDefault(x => x.Id == assignmentId) ?? throw new NotFoundException("Przypisanie nie istnieje.");
        schedule.SubjectLecturers.Remove(item); await repository.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<NoteDto>> ListNotesAsync(Guid scheduleId, CurrentUser user, CancellationToken ct)
    {
        var schedule = await repository.GetAsync(scheduleId, false, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        return schedule.Notes.Where(x => x.DeletedAt == null).OrderBy(x => x.CreatedAt).Select(x => MapNote(x, user)).ToList();
    }

    public async Task<NoteDto> AddNoteAsync(Guid scheduleId, AddNoteRequest request, CurrentUser user, CancellationToken ct)
    {
        _ = await repository.GetAsync(scheduleId, false, ct) ?? throw new NotFoundException("Plan nie istnieje.");
        var note = new ScheduleNote { Id = Guid.NewGuid(), ScheduleId = scheduleId, Title = OptionalTitle(request.Title), Body = Required(request.Body, "Notatka"), AuthorUserId = user.UserId, AuthorEmail = user.Email, AuthorDisplayName = user.DisplayName, AuthorRole = user.Role, CreatedAt = DateTimeOffset.UtcNow };
        await repository.AddNoteAsync(note, ct); await repository.SaveChangesAsync(ct); return MapNote(note, user);
    }

    public async Task<NoteDto> EditNoteAsync(Guid id, EditNoteRequest request, CurrentUser user, CancellationToken ct)
    {
        var note = await repository.GetNoteAsync(id, ct) ?? throw new NotFoundException("Notatka nie istnieje.");
        if (!string.Equals(note.AuthorUserId, user.UserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Można edytować tylko własną notatkę.");
        note.Title = OptionalTitle(request.Title); note.Body = Required(request.Body, "Notatka"); note.UpdatedAt = DateTimeOffset.UtcNow; await repository.SaveChangesAsync(ct); return MapNote(note, user);
    }

    public async Task DeleteNoteAsync(Guid id, CurrentUser user, CancellationToken ct)
    {
        var note = await repository.GetNoteAsync(id, ct) ?? throw new NotFoundException("Notatka nie istnieje.");
        if (!user.IsAdmin && !string.Equals(note.AuthorUserId, user.UserId, StringComparison.Ordinal)) throw new UnauthorizedAccessException("Brak uprawnień do usunięcia notatki.");
        note.DeletedAt = DateTimeOffset.UtcNow; note.DeletedBy = user.Email; note.DeletedByUserId = user.UserId; await repository.SaveChangesAsync(ct);
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
            if (e.Dates?.Any(x => !IsValidDayMonth(x)) == true) throw new ValidationException("Daty zajęć muszą mieć format DD.MM.");
            if (e.MeetingCountOverride is <= 0) throw new ValidationException("Liczba spotkań musi być większa od zera.");
            if (e.StaffingLessonHoursOverride is < 0) throw new ValidationException("Liczba godzin lekcyjnych do obsady nie może być ujemna.");
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
    private static (string Code, string Name) ValidateSubject(SaveScheduleSubjectRequest request) => (Required(request.Code, "Kod przedmiotu").ToUpperInvariant(), Required(request.Name, "Nazwa przedmiotu"));
    private static (string Name, string? Email) ValidateLecturer(SaveScheduleLecturerRequest request)
    {
        var name = Required(request.DisplayName, "Imię i nazwisko wykładowcy");
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (email is not null && !email.Contains('@')) throw new ValidationException("Nieprawidłowy e-mail wykładowcy.");
        return (name, email);
    }
    private static void EnsureUniqueLecturer(SchedulePlan schedule, string name, string? email, Guid? exceptId = null)
    {
        if (schedule.Lecturers.Any(x => x.Id != exceptId && ((email is not null && string.Equals(x.Email, email, StringComparison.OrdinalIgnoreCase)) || string.Equals(x.DisplayName, name, StringComparison.OrdinalIgnoreCase))))
            throw new ConflictException("Wykładowca już istnieje w planie.");
    }
    private static void Apply(ScheduleEntry e, SaveEntryRequest d, CurrentUser actor, DateTimeOffset now) { e.SubjectSource = d.SubjectSource?.Trim(); e.SubjectExternalId = d.SubjectExternalId?.Trim(); e.SubjectCode = d.SubjectCode?.Trim(); e.SubjectName = d.SubjectName.Trim(); e.ClassType = d.ClassType; e.LecturerUserId = string.IsNullOrWhiteSpace(d.LecturerUserId) ? null : d.LecturerUserId.Trim(); e.LecturerEmail = string.IsNullOrWhiteSpace(d.LecturerEmail) ? null : d.LecturerEmail.Trim().ToLowerInvariant(); e.LecturerDisplayName = d.LecturerDisplayName?.Trim() ?? ""; e.Room = string.IsNullOrWhiteSpace(d.Room) ? null : d.Room.Trim(); e.DayOfWeek = d.DayOfWeek; e.StartMinute = d.StartMinute; e.DurationMinutes = d.DurationMinutes; e.Color = d.Color; e.Dates = (d.Dates ?? []).Distinct().OrderBy(x => x[3..]).ThenBy(x => x[..2]).ToList(); e.MeetingCountOverride = d.MeetingCountOverride; e.StaffingLessonHoursOverride = d.StaffingLessonHoursOverride; e.HiddenInPublished = d.HiddenInPublished; e.UpdatedAt = now; e.UpdatedBy = actor.Email; e.UpdatedByUserId = actor.UserId; e.ConcurrencyToken = Guid.NewGuid(); }
    private static string Required(string? value, string field) => !string.IsNullOrWhiteSpace(value) ? value.Trim() : throw new ValidationException($"{field} jest wymagane.");
    private static ScheduleSummaryDto MapSummary(SchedulePlan x) => new(x.Id, x.Faculty.Code, x.Faculty.Name, x.AcademicYear, x.SemesterNumber, x.StudyMode, x.Name, x.Status, x.ConcurrencyToken, x.UpdatedAt, x.UpdatedBy);
    private static ScheduleDto Map(SchedulePlan x, bool publishedView = false) => new(x.Id, x.Faculty.Code, x.Faculty.Name, x.AcademicYear, x.SemesterNumber, x.StudyMode, x.Name, x.Status, x.ConcurrencyToken, x.UpdatedAt, x.UpdatedBy, x.Groups.OrderBy(g => g.SortOrder).Select(g => new GroupDto(g.Id, g.Code, g.Name, g.SortOrder, g.ConcurrencyToken)).ToList(), x.Entries.Where(e => !publishedView || !e.HiddenInPublished).Select(e => new EntryDto(e.Id, e.SubjectSource, e.SubjectExternalId, e.SubjectCode, e.SubjectName, e.ClassType, e.LecturerUserId, e.LecturerEmail, e.LecturerDisplayName, e.Room, e.DayOfWeek, e.StartMinute, e.DurationMinutes, e.Color, e.Dates, e.MeetingCountOverride, e.StaffingLessonHoursOverride, e.HiddenInPublished, e.EntryGroups.Select(g => g.StudentGroupId).ToList(), e.ConcurrencyToken, e.Comments.Count(c => c.DeletedAt == null))).ToList(), x.Subjects.OrderBy(s => s.Name).Select(MapSubject).ToList(), x.Lecturers.OrderBy(l => l.DisplayName).Select(MapLecturer).ToList(), x.SubjectLecturers.Select(MapSubjectLecturer).ToList());
    private static ScheduleSubjectDto MapSubject(ScheduleSubject x) => new(x.Id, x.Code, x.Name);
    private static ScheduleLecturerDto MapLecturer(ScheduleLecturer x) => new(x.Id, x.DisplayName, x.Email);
    private static ScheduleSubjectLecturerDto MapSubjectLecturer(ScheduleSubjectLecturer x) => new(x.Id, x.SubjectCode, x.LecturerKey, x.LecturerDisplayName, x.LecturerUserId, x.LecturerEmail, x.LecturerAssignmentId);
    private static NoteDto MapNote(ScheduleNote x, CurrentUser user) => new(x.Id, x.ScheduleId, x.Title, x.Body, x.AuthorUserId, x.AuthorEmail, x.AuthorDisplayName, x.AuthorRole, x.CreatedAt, x.UpdatedAt, string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal), user.IsAdmin || string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal));
    private static string? OptionalTitle(string? value) { var title = value?.Trim(); if (title?.Length > 200) throw new ValidationException("Tytuł notatki może mieć maksymalnie 200 znaków."); return string.IsNullOrEmpty(title) ? null : title; }
    private static bool IsValidDayMonth(string value) => System.Text.RegularExpressions.Regex.IsMatch(value, @"^(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])$") && DateOnly.TryParseExact($"{value}.2000", "dd.MM.yyyy", null, System.Globalization.DateTimeStyles.None, out _);
    private static CommentDto MapComment(ScheduleComment x, CurrentUser user) => new(x.Id, x.ScheduleEntryId, x.Body, x.AuthorUserId, x.AuthorEmail, x.AuthorDisplayName, x.AuthorRole, x.CreatedAt, x.UpdatedAt, string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal), user.IsAdmin || string.Equals(x.AuthorUserId, user.UserId, StringComparison.Ordinal));
}
