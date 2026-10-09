using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFacultyWorkloadProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.AddColumn<Guid>(
                name: "LecturerProfileId",
                table: "schedule_subject_lecturers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LecturerProfileId",
                table: "schedule_lecturers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LecturerProfileId",
                table: "schedule_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lecturer_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    AcademicTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lecturer_profiles", x => x.Id);
                });

            migrationBuilder.Sql("""
                INSERT INTO lecturer_profiles ("Id", "UserId", "DisplayName", "Email", "ConcurrencyToken", "CreatedAt", "UpdatedAt")
                SELECT md5(coalesce("LecturerUserId", '') || '|' || coalesce(lower("LecturerEmail"), '') || '|' || "LecturerDisplayName")::uuid,
                       "LecturerUserId", "LecturerDisplayName", lower(nullif("LecturerEmail", '')),
                       md5('token|' || coalesce("LecturerUserId", '') || '|' || "LecturerDisplayName")::uuid, now(), now()
                FROM schedule_entries
                WHERE "LecturerDisplayName" <> ''
                GROUP BY "LecturerUserId", "LecturerEmail", "LecturerDisplayName"
                ON CONFLICT ("Id") DO NOTHING;
                UPDATE schedule_entries e SET "LecturerProfileId" = p."Id"
                FROM lecturer_profiles p
                WHERE p."Id" = md5(coalesce(e."LecturerUserId", '') || '|' || coalesce(lower(e."LecturerEmail"), '') || '|' || e."LecturerDisplayName")::uuid;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "AcademicYear", "SemesterNumber", "StudyMode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_schedule_subject_lecturers_LecturerProfileId",
                table: "schedule_subject_lecturers",
                column: "LecturerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_schedule_lecturers_LecturerProfileId",
                table: "schedule_lecturers",
                column: "LecturerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_schedule_entries_LecturerProfileId",
                table: "schedule_entries",
                column: "LecturerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_lecturer_profiles_Email",
                table: "lecturer_profiles",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_lecturer_profiles_UserId",
                table: "lecturer_profiles",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_schedule_entries_lecturer_profiles_LecturerProfileId",
                table: "schedule_entries",
                column: "LecturerProfileId",
                principalTable: "lecturer_profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_schedule_lecturers_lecturer_profiles_LecturerProfileId",
                table: "schedule_lecturers",
                column: "LecturerProfileId",
                principalTable: "lecturer_profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_schedule_subject_lecturers_lecturer_profiles_LecturerProfil~",
                table: "schedule_subject_lecturers",
                column: "LecturerProfileId",
                principalTable: "lecturer_profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_schedule_entries_lecturer_profiles_LecturerProfileId",
                table: "schedule_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_schedule_lecturers_lecturer_profiles_LecturerProfileId",
                table: "schedule_lecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_schedule_subject_lecturers_lecturer_profiles_LecturerProfil~",
                table: "schedule_subject_lecturers");

            migrationBuilder.DropTable(
                name: "lecturer_profiles");

            migrationBuilder.DropIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules");

            migrationBuilder.DropIndex(
                name: "IX_schedule_subject_lecturers_LecturerProfileId",
                table: "schedule_subject_lecturers");

            migrationBuilder.DropIndex(
                name: "IX_schedule_lecturers_LecturerProfileId",
                table: "schedule_lecturers");

            migrationBuilder.DropIndex(
                name: "IX_schedule_entries_LecturerProfileId",
                table: "schedule_entries");

            migrationBuilder.DropColumn(
                name: "LecturerProfileId",
                table: "schedule_subject_lecturers");

            migrationBuilder.DropColumn(
                name: "LecturerProfileId",
                table: "schedule_lecturers");

            migrationBuilder.DropColumn(
                name: "LecturerProfileId",
                table: "schedule_entries");

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "SemesterNumber", "StudyMode" },
                unique: true);
        }
    }
}
