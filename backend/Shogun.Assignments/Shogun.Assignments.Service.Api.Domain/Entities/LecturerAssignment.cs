namespace Shogun.Assignments.Service.Api.Domain.Entities;

public class LecturerAssignment
{
    public int Id { get; set; }
    public string LecturerFirstName { get; set; } = string.Empty;
    public string LecturerLastName { get; set; } = string.Empty;
    public string? LecturerUserId { get; set; }
    public string? LecturerEmail { get; set; }

    /// <summary>"zimowy" or "letni"</summary>
    public string SemesterType { get; set; } = string.Empty;

    /// <summary>e.g. "2026/27"</summary>
    public string AcademicYear { get; set; } = string.Empty;

    public string? Notes { get; set; }
    public DateTime SubmittedAt { get; set; }

    public List<AssignmentSubject> Subjects { get; set; } = [];
    public List<AssignmentAvailability> Availability { get; set; } = [];
}
