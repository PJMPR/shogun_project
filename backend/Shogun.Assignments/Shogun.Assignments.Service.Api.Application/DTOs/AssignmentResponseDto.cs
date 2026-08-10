namespace Shogun.Assignments.Service.Api.Application.DTOs;

public class AssignmentResponseDto
{
    public int Id { get; set; }
    public string LecturerFirstName { get; set; } = string.Empty;
    public string LecturerLastName { get; set; } = string.Empty;
    public string? LecturerUserId { get; set; }
    public string? LecturerEmail { get; set; }
    public string SemesterType { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime SubmittedAt { get; set; }
    public List<AssignmentSubjectDto> Subjects { get; set; } = [];
    public List<AssignmentAvailabilityDto> Availability { get; set; } = [];
}

public class AssignmentSubjectDto
{
    public int Id { get; set; }
    public string? MongoId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string TrybStudiow { get; set; } = string.Empty;
    public int Semester { get; set; }
    public bool HasWyklad { get; set; }
    public bool HasCwiczenia { get; set; }
    public bool HasLab { get; set; }
}

public class AssignmentAvailabilityDto
{
    public int Id { get; set; }
    public string Day { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
}
