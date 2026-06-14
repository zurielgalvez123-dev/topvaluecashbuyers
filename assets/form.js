/* =========================================================================
   Top Value Cash Buyers — lead form handler
   No dependencies. Works from disk or static host.
   =========================================================================

   ┌───────────────────────────────────────────────────────────────────┐
   │  CONFIGURABLE CONSTANTS — review / swap these before launch.        │
   └───────────────────────────────────────────────────────────────────┘ */

/* Where the lead form POSTs.
   Default = null  ->  NO network call. The form runs in "demo" mode:
   it validates, shows the success message, and console.logs the payload.

   LIVE: posts to FormSubmit (no backend needed; emails each lead to the
   address below). First submission triggers a one-time activation email —
   click "Activate Form" once and every lead thereafter is delivered. */
const FORM_ENDPOINT = "https://formsubmit.co/ajax/contact@topvaluecashbuyers.com";

/* Public-facing contact + opt-out details (kept in sync with the footer /
   privacy page placeholders). Update everywhere at launch. */
const CONTACT_EMAIL = "contact@topvaluecashbuyers.com";

/* ========================================================================= */

(function () {
  "use strict";

  const form = document.getElementById("lead-form");
  if (!form) return;

  const successEl = document.getElementById("form-success");
  const submitBtn = form.querySelector('[type="submit"]');
  const consentWrap = document.getElementById("consent-wrap");

  // ---- validation helpers ------------------------------------------------
  const setError = (field, on) => {
    const wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("invalid", on);
  };

  const isPhone = (v) => {
    const digits = (v.match(/\d/g) || []).length;
    return digits >= 10 && digits <= 15;
  };
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function validate() {
    let ok = true;

    const required = [
      { el: form.fullName, test: (v) => v.trim().length >= 2 },
      { el: form.phone,    test: (v) => isPhone(v) },
      { el: form.address,  test: (v) => v.trim().length >= 5 },
    ];

    required.forEach(({ el, test }) => {
      const good = test(el.value);
      setError(el, !good);
      if (!good) ok = false;
    });

    // email is OPTIONAL — only validate if something was typed
    if (form.email.value.trim() !== "") {
      const good = isEmail(form.email.value);
      setError(form.email, !good);
      if (!good) ok = false;
    } else {
      setError(form.email, false);
    }

    // consent checkbox is required for TCPA compliance
    const consentGood = form.consent.checked;
    consentWrap.classList.toggle("invalid", !consentGood);
    if (!consentGood) ok = false;

    return ok;
  }

  // live-clear errors as the user fixes them
  form.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => setError(el, false));
  });
  form.consent.addEventListener("change", () =>
    consentWrap.classList.toggle("invalid", !form.consent.checked)
  );

  // ---- submit ------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) {
      const firstBad = form.querySelector(".field.invalid input, .field.invalid textarea")
        || (!form.consent.checked ? form.consent : null);
      if (firstBad) firstBad.focus();
      return;
    }

    const payload = {
      fullName: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      propertyAddress: form.address.value.trim(),
      email: form.email.value.trim() || null,
      timeline: (form.timeline && form.timeline.value) || null,
      situation: (form.situation && form.situation.value) || null,
      message: form.message.value.trim() || null,
      consent: true,
      consentText: form.consent.dataset.consentText || "",
      submittedAt: new Date().toISOString(),
      page: location.href,
      // FormSubmit control fields (ignored by other backends):
      _subject: "🏠 New cash-offer lead — Top Value Cash Buyers",
      _template: "table",
      _captcha: "false",
    };

    const finish = () => {
      form.style.display = "none";
      successEl.classList.add("show");
      successEl.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // ---- DEMO MODE (no endpoint configured) ----
    if (!FORM_ENDPOINT) {
      // eslint-disable-next-line no-console
      console.log(
        "%c[Top Value Cash Buyers] Lead captured (demo mode — no FORM_ENDPOINT set):",
        "color:#c98a2b;font-weight:bold",
        payload
      );
      finish();
      return;
    }

    // ---- LIVE MODE (endpoint configured) ----
    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Sending…";
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Bad status " + res.status);
      finish();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Top Value Cash Buyers] Submit failed:", err);
      submitBtn.disabled = false;
      submitBtn.innerHTML = original;
      alert(
        "Sorry — something went wrong sending your request. " +
          "Please try again, or email us at " + CONTACT_EMAIL + "."
      );
    }
  });

  // ---------------------------------------------------------------- chrome
  // sticky header shadow
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // scroll reveal
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // mobile sticky CTA: show after the hero, hide while the form is on screen
  const mobileCta = document.querySelector(".mobile-cta");
  const offerSection = document.getElementById("offer");
  if (mobileCta) {
    let pastHero = false;
    let formVisible = false;
    const sync = () => mobileCta.classList.toggle("show", pastHero && !formVisible);

    const heroEl = document.querySelector(".hero");
    if ("IntersectionObserver" in window && heroEl) {
      new IntersectionObserver(
        ([e]) => { pastHero = !e.isIntersecting; sync(); },
        { threshold: 0, rootMargin: "-40% 0px 0px 0px" }
      ).observe(heroEl);
    } else {
      pastHero = true;
    }

    if ("IntersectionObserver" in window && offerSection) {
      new IntersectionObserver(
        ([e]) => { formVisible = e.isIntersecting; sync(); },
        { threshold: 0.15 }
      ).observe(offerSection);
    }
    sync();
  }

  // current year in footer(s)
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
