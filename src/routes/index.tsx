<div className="min-w-0 w-full">
  <p className="max-w-full text-[11px] font-semibold uppercase leading-5 tracking-[0.18em] text-primary sm:text-xs sm:tracking-[0.22em]">
    Business Growth Intelligence for ambitious teams
  </p>

  <h1 className="mt-4 max-w-3xl break-words font-display text-[2.35rem] font-semibold leading-[1.05] sm:text-5xl lg:text-[3.9rem]">
    Stop losing opportunities to{" "}
    <span className="text-gradient-gold">
      scattered follow-up.
    </span>
  </h1>

  <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
    GROWTH helps business owners, teams and white-label partners capture enquiries,
    organise follow-up and create a clearer route from customer interest to the next
    business action.
  </p>

  {/* PAIN POINTS */}
  <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        Enquiries everywhere?
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Bring customer enquiries into a more organised process instead of relying on
        scattered messages, memory and manual follow-up.
      </p>
    </div>

    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        Follow-up becoming inconsistent?
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Give every legitimate enquiry a clearer next step so potential customers are
        easier to track and respond to.
      </p>
    </div>

    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        Too much happening manually?
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Create a stronger operating system for customer information, follow-up and
        internal business workflows.
      </p>
    </div>

    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        Need better visibility?
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Turn business activity into clearer information that helps you decide what
        needs attention next.
      </p>
    </div>
  </div>

  {/* GROWTH SYSTEM */}
  <div className="mt-6 w-full max-w-2xl rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
    <p className="text-[11px] font-semibold uppercase leading-5 tracking-[0.15em] text-primary sm:text-xs sm:tracking-[0.18em]">
      A clearer growth operating system
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="min-w-0 border-b border-border/50 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
        <p className="text-sm font-semibold text-foreground">
          Capture
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Record legitimate enquiries and keep the original customer request.
        </p>
      </div>

      <div className="min-w-0 border-b border-border/50 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
        <p className="text-sm font-semibold text-foreground">
          Organise
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Structure follow-up and business information more clearly.
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Act
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Know what needs attention next instead of relying on guesswork.
        </p>
      </div>
    </div>
  </div>

  {/* CONTACT CTAS */}
  <div className="mt-7 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
    <a
      href={phoneHref}
      className="block w-full sm:w-auto"
      onClick={() =>
        trackGrowthMeasurementEvent("growth_contact_click", {
          method: "phone",
          placement: "hero",
        })
      }
    >
      <Button className="min-h-11 w-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:min-w-52">
        <Phone className="mr-2 h-4 w-4 shrink-0" />
        Talk to Cossa
      </Button>
    </a>

    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      className="block w-full sm:w-auto"
      onClick={() =>
        trackGrowthMeasurementEvent("growth_contact_click", {
          method: "whatsapp",
          placement: "hero",
        })
      }
    >
      <Button
        variant="outline"
        className="min-h-11 w-full border-primary/40 px-5 text-primary hover:bg-primary/10 sm:min-w-52"
      >
        <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
        WhatsApp Cossa
      </Button>
    </a>
  </div>

  <a
    href={emailHref}
    onClick={() =>
      trackGrowthMeasurementEvent("growth_contact_click", {
        method: "email",
        placement: "hero",
      })
    }
    className="mt-4 inline-flex max-w-full items-start gap-2 text-sm leading-5 text-muted-foreground transition-colors hover:text-primary"
  >
    <Mail className="mt-0.5 h-4 w-4 shrink-0" />

    <span className="min-w-0 break-all sm:break-normal">
      Prefer email? cossa@cossanexusholdings.co.za
    </span>
  </a>
</div>
