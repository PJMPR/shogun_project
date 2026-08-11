using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RestoreSinglePlanPerSemesterAndMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.Sql(
                """
                WITH ranked AS (
                    SELECT "Id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "FacultyId", "SemesterNumber", "StudyMode"
                               ORDER BY "UpdatedAt" DESC, "Id" DESC
                           ) AS position
                    FROM schedules
                )
                DELETE FROM schedules
                WHERE "Id" IN (SELECT "Id" FROM ranked WHERE position > 1);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "SemesterNumber", "StudyMode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "AcademicYear", "SemesterNumber", "StudyMode" });
        }
    }
}
