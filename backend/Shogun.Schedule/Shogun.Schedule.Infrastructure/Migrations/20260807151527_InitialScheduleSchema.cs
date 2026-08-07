using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialScheduleSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:class_type", "lecture,exercises,laboratory,project,seminar,other")
                .Annotation("Npgsql:Enum:schedule_status", "draft,published")
                .Annotation("Npgsql:Enum:study_mode", "stationary,part_time");

            migrationBuilder.CreateTable(
                name: "faculties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_faculties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "schedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacultyId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYear = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    SemesterNumber = table.Column<int>(type: "integer", nullable: false),
                    StudyMode = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedules", x => x.Id);
                    table.CheckConstraint("ck_schedules_semester", "\"SemesterNumber\" BETWEEN 1 AND 8");
                    table.CheckConstraint("ck_schedules_year", "\"AcademicYear\" ~ '^[0-9]{4}/[0-9]{4}$'");
                    table.ForeignKey(
                        name: "FK_schedules_faculties_FacultyId",
                        column: x => x.FacultyId,
                        principalTable: "faculties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "schedule_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectSource = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    SubjectExternalId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SubjectCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    SubjectName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ClassType = table.Column<int>(type: "integer", nullable: false),
                    LecturerEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    LecturerDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Room = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartMinute = table.Column<int>(type: "integer", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_entries", x => x.Id);
                    table.CheckConstraint("ck_entries_day", "\"DayOfWeek\" BETWEEN 0 AND 6");
                    table.CheckConstraint("ck_entries_time", "\"StartMinute\" >= 480 AND \"StartMinute\" + \"DurationMinutes\" <= 1200 AND \"StartMinute\" % 15 = 0 AND \"DurationMinutes\" > 0 AND \"DurationMinutes\" % 15 = 0");
                    table.ForeignKey(
                        name: "FK_schedule_entries_schedules_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "schedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "student_groups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_groups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_groups_schedules_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "schedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "schedule_comments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    AuthorEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    AuthorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AuthorRole = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_schedule_comments_schedule_entries_ScheduleEntryId",
                        column: x => x.ScheduleEntryId,
                        principalTable: "schedule_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "schedule_entry_groups",
                columns: table => new
                {
                    ScheduleEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentGroupId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_entry_groups", x => new { x.ScheduleEntryId, x.StudentGroupId });
                    table.ForeignKey(
                        name: "FK_schedule_entry_groups_schedule_entries_ScheduleEntryId",
                        column: x => x.ScheduleEntryId,
                        principalTable: "schedule_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_schedule_entry_groups_student_groups_StudentGroupId",
                        column: x => x.StudentGroupId,
                        principalTable: "student_groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "faculties",
                columns: new[] { "Id", "Code", "CreatedAt", "Name" },
                values: new object[] { new Guid("31e7c100-9d3f-4eb1-a388-c38f36b999a1"), "WI", new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Wydział Informatyki" });

            migrationBuilder.CreateIndex(
                name: "IX_faculties_Code",
                table: "faculties",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_schedule_comments_ScheduleEntryId_CreatedAt",
                table: "schedule_comments",
                columns: new[] { "ScheduleEntryId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_entries_ScheduleId_DayOfWeek_StartMinute",
                table: "schedule_entries",
                columns: new[] { "ScheduleId", "DayOfWeek", "StartMinute" });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_entries_ScheduleId_LecturerEmail",
                table: "schedule_entries",
                columns: new[] { "ScheduleId", "LecturerEmail" });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_entry_groups_StudentGroupId",
                table: "schedule_entry_groups",
                column: "StudentGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_schedules_FacultyId_AcademicYear_SemesterNumber_StudyMode",
                table: "schedules",
                columns: new[] { "FacultyId", "AcademicYear", "SemesterNumber", "StudyMode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_groups_ScheduleId_Code",
                table: "student_groups",
                columns: new[] { "ScheduleId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_groups_ScheduleId_SortOrder",
                table: "student_groups",
                columns: new[] { "ScheduleId", "SortOrder" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "schedule_comments");

            migrationBuilder.DropTable(
                name: "schedule_entry_groups");

            migrationBuilder.DropTable(
                name: "schedule_entries");

            migrationBuilder.DropTable(
                name: "student_groups");

            migrationBuilder.DropTable(
                name: "schedules");

            migrationBuilder.DropTable(
                name: "faculties");
        }
    }
}
