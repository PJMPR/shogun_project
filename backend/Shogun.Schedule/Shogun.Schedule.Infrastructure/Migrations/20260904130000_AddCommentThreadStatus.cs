using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations;

[DbContext(typeof(ScheduleDbContext))]
[Migration("20260904130000_AddCommentThreadStatus")]
public partial class AddCommentThreadStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "CommentThreadClosed",
            table: "schedule_entries",
            type: "boolean",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "CommentThreadClosed",
            table: "schedule_entries");
    }
}
