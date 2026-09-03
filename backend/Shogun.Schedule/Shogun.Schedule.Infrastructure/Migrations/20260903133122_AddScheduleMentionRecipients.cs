using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleMentionRecipients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "schedule_comment_recipients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleCommentId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RecipientDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RecipientEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_comment_recipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_schedule_comment_recipients_schedule_comments_ScheduleComme~",
                        column: x => x.ScheduleCommentId,
                        principalTable: "schedule_comments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "schedule_note_recipients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduleNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RecipientDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RecipientEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_note_recipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_schedule_note_recipients_schedule_notes_ScheduleNoteId",
                        column: x => x.ScheduleNoteId,
                        principalTable: "schedule_notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_comment_recipients_ScheduleCommentId_RecipientUser~",
                table: "schedule_comment_recipients",
                columns: new[] { "ScheduleCommentId", "RecipientUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_schedule_note_recipients_ScheduleNoteId_RecipientUserId",
                table: "schedule_note_recipients",
                columns: new[] { "ScheduleNoteId", "RecipientUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "schedule_comment_recipients");

            migrationBuilder.DropTable(
                name: "schedule_note_recipients");
        }
    }
}
