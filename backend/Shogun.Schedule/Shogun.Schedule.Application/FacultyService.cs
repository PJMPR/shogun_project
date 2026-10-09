using System.Security.Cryptography;
using System.Text;
using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Application;

public sealed class FacultyService(IFacultyRepository repository) : IFacultyService
{
    public async Task<FacultyFiltersDto> GetFiltersAsync(CancellationToken ct)
    {
        var faculties = await repository.ListFacultiesAsync(ct);
        var years = (await repository.ListSchedulesAsync(ct)).Select(x => x.AcademicYear).Distinct().OrderByDescending(x => x).ToList();
        return new FacultyFiltersDto(years, faculties.Select(x => new FacultyOptionDto(x.Code, x.Name)).ToList(),
            [new StudyModeOptionDto(StudyMode.Stationary, "Stacjonarny"), new StudyModeOptionDto(StudyMode.PartTime, "Niestacjonarny")], "I stopień");
    }

    public async Task<FacultyWorkloadDto> GetWorkloadAsync(string academicYear, string facultyCode, StudyMode studyMode, CancellationToken ct)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(academicYear ?? "", "^[0-9]{4}/[0-9]{4}$")) throw new ValidationException("Niepoprawny rok akademicki.");
        var plans = await repository.ListForWorkloadAsync(academicYear ?? string.Empty, facultyCode.Trim().ToUpperInvariant(), studyMode, ct);
        var lecturers = new Dictionary<Guid, FacultyLecturerDto>(); var subjects = new Dictionary<Guid, FacultySubjectDto>();
        var assignments = new Dictionary<(Guid Lecturer, Guid Subject, int Semester, ClassType Type), decimal>(); var unassigned = 0;
        foreach (var plan in plans)
        foreach (var entry in plan.Entries)
        {
            if (string.IsNullOrWhiteSpace(entry.LecturerDisplayName) && entry.LecturerProfileId is null) { unassigned++; continue; }
            var lecturerId = entry.LecturerProfileId ?? StableId($"legacy:{plan.Id}:{entry.LecturerUserId}:{entry.LecturerEmail}:{entry.LecturerDisplayName}");
            var lecturerName = entry.LecturerProfile?.DisplayName ?? entry.LecturerDisplayName;
            if (!lecturers.ContainsKey(lecturerId)) lecturers[lecturerId] = new FacultyLecturerDto(lecturerId, lecturerName, entry.LecturerProfile?.Email ?? entry.LecturerEmail, entry.LecturerProfile?.AcademicTitle, entry.LecturerProfile?.ConcurrencyToken ?? Guid.Empty);
            var sourceSubject = plan.Subjects.FirstOrDefault(x => (!string.IsNullOrWhiteSpace(entry.SubjectCode) && x.Code == entry.SubjectCode) || x.Name == entry.SubjectName);
            var subjectId = sourceSubject?.Id ?? StableId($"subject:{plan.FacultyId}:{entry.SubjectCode}:{entry.SubjectName}");
            subjects.TryAdd(subjectId, new FacultySubjectDto(subjectId, sourceSubject?.Code ?? entry.SubjectCode, sourceSubject?.Name ?? entry.SubjectName));
            var meetings = entry.MeetingCountOverride ?? (entry.Dates.Count > 0 ? entry.Dates.Count : (studyMode == StudyMode.Stationary ? 15 : 8));
            var hours = entry.StaffingLessonHoursOverride is > 0 ? entry.StaffingLessonHoursOverride.Value : entry.DurationMinutes / 45m * meetings;
            var key = (lecturerId, subjectId, plan.SemesterNumber, entry.ClassType);
            assignments[key] = assignments.GetValueOrDefault(key) + hours;
        }
        var result = assignments.Select(x => new FacultyAssignmentDto(x.Key.Lecturer, x.Key.Subject, academicYear, facultyCode.Trim().ToUpperInvariant(), "I stopień", studyMode, x.Key.Semester, x.Key.Semester % 2 == 1 ? "zimowy" : "letni", x.Key.Type == ClassType.Lecture ? "wykład" : "ćwiczenia", x.Value)).ToList();
        return new FacultyWorkloadDto(lecturers.Values.OrderBy(x => x.DisplayName).ToList(), subjects.Values.OrderBy(x => x.Name).ToList(), result, unassigned);
    }

    public async Task<IReadOnlyList<FacultyLecturerDto>> ListLecturersAsync(string? query, CancellationToken ct) => (await repository.ListLecturerProfilesAsync(query, ct)).Select(Map).ToList();

    public async Task<IReadOnlyList<FacultyTitleUpdateResult>> UpdateTitlesAsync(FacultyTitleUpdateRequest request, CurrentUser user, CancellationToken ct)
    {
        if (request.Items is null || request.Items.Select(x => x.LecturerId).Distinct().Count() != request.Items.Count) throw new ValidationException("Powtórzone osoby w partii.");
        var profiles = await repository.GetLecturerProfilesAsync(request.Items.Select(x => x.LecturerId).ToList(), ct);
        if (profiles.Count != request.Items.Count) throw new NotFoundException("Nie znaleziono prowadzącego.");
        foreach (var item in request.Items)
        {
            var profile = profiles.Single(x => x.Id == item.LecturerId);
            if (profile.ConcurrencyToken != item.ConcurrencyToken) throw new ConflictException("Dane prowadzącego zostały zmienione.");
            if (item.AcademicTitle?.Length > 200) throw new ValidationException("Tytuł może mieć maksymalnie 200 znaków.");
            profile.AcademicTitle = string.IsNullOrWhiteSpace(item.AcademicTitle) ? null : item.AcademicTitle.Trim(); profile.UpdatedAt = DateTimeOffset.UtcNow; profile.UpdatedByUserId = user.UserId; profile.ConcurrencyToken = Guid.NewGuid();
        }
        await repository.SaveChangesAsync(ct); return profiles.Select(x => new FacultyTitleUpdateResult(x.Id, x.AcademicTitle, x.ConcurrencyToken)).ToList();
    }

    private static FacultyLecturerDto Map(LecturerProfile x) => new(x.Id, x.DisplayName, x.Email, x.AcademicTitle, x.ConcurrencyToken);
    private static Guid StableId(string value) => new(MD5.HashData(Encoding.UTF8.GetBytes(value)));
}
