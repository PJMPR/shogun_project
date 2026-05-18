namespace Shogun.Assignments.Service.Api.Application.DTOs;

public class CreateAssignmentDto
{
    /// <summary>"zimowy" or "letni"</summary>
    public string SemesterType { get; set; } = string.Empty;

    /// <summary>e.g. "2026/27"</summary>
    public string AcademicYear { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public List<CreateAssignmentSubjectDto> Subjects { get; set; } = [];
    public List<CreateAssignmentAvailabilityDto> Availability { get; set; } = [];
}

public class CreateAssignmentSubjectDto
{
    /// <summary>ObjectId from MongoDB programs collection (optional).</summary>
    public string? MongoId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }

    /// <summary>"stacjonarny" or "niestacjonarny"</summary>
    public string TrybStudiow { get; set; } = string.Empty;

    public int Semester { get; set; }
    public bool HasWyklad { get; set; }
    public bool HasCwiczenia { get; set; }
    public bool HasLab { get; set; }
}

public class CreateAssignmentAvailabilityDto
{
    /// <summary>Day abbreviation, e.g. "Pn", "Sb".</summary>
    public string Day { get; set; } = string.Empty;

    /// <summary>"HH:mm"</summary>
    public string From { get; set; } = string.Empty;

    /// <summary>"HH:mm"</summary>
    public string To { get; set; } = string.Empty;
}
