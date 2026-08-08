using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceSinglePublishedSchedulePerFaculty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.Sql("""
                WITH ranked AS (
                    SELECT "Id", ROW_NUMBER() OVER (
                        PARTITION BY "FacultyId"
                        ORDER BY "UpdatedAt" DESC, "Id" DESC
                    ) AS position
                    FROM schedules
                    WHERE "Status" = 2
                )
                UPDATE schedules
                SET "Status" = 1
                WHERE "Id" IN (SELECT "Id" FROM ranked WHERE position > 1);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId",
                table: "schedules",
                column: "FacultyId",
                unique: true,
                filter: "\"Status\" = 2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
    }
}
