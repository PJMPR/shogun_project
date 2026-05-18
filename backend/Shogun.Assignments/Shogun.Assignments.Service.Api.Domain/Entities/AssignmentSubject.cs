namespace Shogun.Assignments.Service.Api.Domain.Entities;

public class AssignmentSubject
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }

    /// <summary>ObjectId of the subject document in MongoDB (nullable — not always available).</summary>
    public string? SubjectMongoId { get; set; }

    public string SubjectName { get; set; } = string.Empty;
    public string? SubjectCode { get; set; }

    /// <summary>"stacjonarny" or "niestacjonarny"</summary>
    public string TrybStudiow { get; set; } = string.Empty;

    public int Semester { get; set; }
    public bool HasWyklad { get; set; }
    public bool HasCwiczenia { get; set; }
    public bool HasLab { get; set; }

    public LecturerAssignment Assignment { get; set; } = null!;
}
