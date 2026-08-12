using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleSubjectLecturers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "schedule_subject_lecturers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    LecturerKey = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    LecturerDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LecturerUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LecturerEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    LecturerAssignmentId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    CreatedByUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_subject_lecturers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_schedule_subject_lecturers_schedules_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "schedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_subject_lecturers_ScheduleId_SubjectCode_LecturerK~",
                table: "schedule_subject_lecturers",
                columns: new[] { "ScheduleId", "SubjectCode", "LecturerKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "schedule_subject_lecturers");
        }
    }
}
