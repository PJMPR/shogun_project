using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shogun.Schedule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNewMediaArtsFaculty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "faculties",
                keyColumn: "Id",
                keyValue: new Guid("31e7c100-9d3f-4eb1-a388-c38f36b999a1"),
                column: "Name",
                value: "Informatyka");

            migrationBuilder.InsertData(
                table: "faculties",
                columns: new[] { "Id", "Code", "CreatedAt", "Name" },
                values: new object[] { new Guid("63c16df1-c743-41e0-b6da-8c67b19d5b1e"), "SNM", new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Sztuka Nowych Mediów" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "faculties",
                keyColumn: "Id",
                keyValue: new Guid("63c16df1-c743-41e0-b6da-8c67b19d5b1e"));

            migrationBuilder.UpdateData(
                table: "faculties",
                keyColumn: "Id",
                keyValue: new Guid("31e7c100-9d3f-4eb1-a388-c38f36b999a1"),
                column: "Name",
                value: "Wydział Informatyki");
        }
    }
}
