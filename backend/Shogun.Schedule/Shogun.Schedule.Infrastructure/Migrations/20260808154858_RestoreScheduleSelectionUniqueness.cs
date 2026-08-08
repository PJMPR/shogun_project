using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RestoreScheduleSelectionUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId",
                table: "schedules");

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "AcademicYear", "SemesterNumber", "StudyMode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId",
                table: "schedules",
                column: "FacultyId",
                unique: true,
                filter: "\"Status\" = 2");
        }
    }
}
