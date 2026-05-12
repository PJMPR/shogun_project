using FluentValidation;
using Shogun.Syllabi.Service.Application.DTOs;

namespace Shogun.Syllabi.Service.Application.Validators;

public class CreateSyllabusRequestValidator : AbstractValidator<CreateSyllabusRequest>
{
    public CreateSyllabusRequestValidator()
    {
        RuleFor(x => x.kod_przedmiotu)
            .NotEmpty().WithMessage("kod_przedmiotu is required.")
            .MaximumLength(20).WithMessage("kod_przedmiotu must not exceed 20 characters.");

        RuleFor(x => x.tryb_studiow)
            .NotEmpty().WithMessage("tryb_studiow is required.")
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");
    }
}

public class UpdateSyllabusRequestValidator : AbstractValidator<UpdateSyllabusRequest>
{
    public UpdateSyllabusRequestValidator()
    {
        RuleFor(x => x.kod_przedmiotu)
            .NotEmpty().WithMessage("kod_przedmiotu is required.")
            .MaximumLength(20).WithMessage("kod_przedmiotu must not exceed 20 characters.");

        RuleFor(x => x.tryb_studiow)
            .NotEmpty().WithMessage("tryb_studiow is required.")
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");
    }
}

public class CreateProgramRequestValidator : AbstractValidator<CreateProgramRequest>
{
    public CreateProgramRequestValidator()
    {
        RuleFor(x => x.tryb_studiow)
            .NotEmpty()
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");

        RuleFor(x => x.lang)
            .NotEmpty()
            .Must(v => v == "pl" || v == "en")
            .WithMessage("lang must be 'pl' or 'en'.");
    }
}

public class UpdateProgramRequestValidator : AbstractValidator<UpdateProgramRequest>
{
    public UpdateProgramRequestValidator()
    {
        RuleFor(x => x.tryb_studiow)
            .NotEmpty()
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");

        RuleFor(x => x.lang)
            .NotEmpty()
            .Must(v => v == "pl" || v == "en")
            .WithMessage("lang must be 'pl' or 'en'.");
    }
}

public class CreateElectiveRequestValidator : AbstractValidator<CreateElectiveRequest>
{
    public CreateElectiveRequestValidator()
    {
        RuleFor(x => x.elective_type)
            .NotEmpty()
            .Must(v => v == "other" || v == "specializations")
            .WithMessage("elective_type must be 'other' or 'specializations'.");

        RuleFor(x => x.tryb_studiow)
            .NotEmpty()
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");

        RuleFor(x => x.lang)
            .NotEmpty()
            .Must(v => v == "pl" || v == "en")
            .WithMessage("lang must be 'pl' or 'en'.");
    }
}

public class UpdateElectiveRequestValidator : AbstractValidator<UpdateElectiveRequest>
{
    public UpdateElectiveRequestValidator()
    {
        RuleFor(x => x.elective_type)
            .NotEmpty()
            .Must(v => v == "other" || v == "specializations")
            .WithMessage("elective_type must be 'other' or 'specializations'.");

        RuleFor(x => x.tryb_studiow)
            .NotEmpty()
            .Must(v => v == "stacjonarny" || v == "niestacjonarny")
            .WithMessage("tryb_studiow must be 'stacjonarny' or 'niestacjonarny'.");

        RuleFor(x => x.lang)
            .NotEmpty()
            .Must(v => v == "pl" || v == "en")
            .WithMessage("lang must be 'pl' or 'en'.");
    }
}
