namespace Shogun.Assignments.Service.Api.Domain.Entities;

public class AssignmentAvailability
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }

    /// <summary>Day abbreviation, e.g. "Pn", "Wt", "Sb".</summary>
    public string Day { get; set; } = string.Empty;

    /// <summary>Time in "HH:mm" format.</summary>
    public string FromTime { get; set; } = string.Empty;

    /// <summary>Time in "HH:mm" format.</summary>
    public string ToTime { get; set; } = string.Empty;

    public LecturerAssignment Assignment { get; set; } = null!;
}
