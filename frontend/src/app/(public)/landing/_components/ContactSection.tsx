"use client";

import React, { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Mail, MessageCircle, Send } from "lucide-react";

interface ContactFormState {
  name: string;
  agencyName: string;
  email: string;
  phone: string;
  message: string;
}

const EMPTY_FORM: ContactFormState = {
  name: "",
  agencyName: "",
  email: "",
  phone: "",
  message: "",
};

// Shared shape for the two "quick contact" pills (WhatsApp / Email / disabled state).
const PILL_CLASSES =
  "inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

// Matches components/ui/input.tsx's visual language (border-input, focus ring, disabled states)
// so the free-text message field feels like the same design system, without needing a new
// shared Textarea primitive for this one field.
const TEXTAREA_CLASSES =
  "flex min-h-24 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

export default function ContactSection({
  email = "contact@labgenz.com",
  whatsapp = "",
}: {
  email?: string;
  whatsapp?: string;
}) {
  const uid = useId();
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const whatsappDigits = useMemo(() => whatsapp.replace(/\D/g, ""), [whatsapp]);
  const hasWhatsapp = whatsappDigits.length > 0;

  const quickWhatsappHref = hasWhatsapp
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        "Hi! I run a car rental agency and I'd like to book a demo / early access on Fider.",
      )}`
    : undefined;

  const quickEmailHref = `mailto:${email}?subject=${encodeURIComponent(
    "Demo request — Fider",
  )}&body=${encodeURIComponent(
    "Hi Fider team,\n\nI'd like to book a demo / early access for my car rental agency.\n\nAgency name:\nCity:\nFleet size:\n\nThanks!",
  )}`;

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = [
      `New Fider inquiry${form.agencyName ? ` — ${form.agencyName}` : ""}`,
      "",
      `Name: ${form.name}`,
      form.agencyName ? `Agency: ${form.agencyName}` : null,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : null,
      "",
      form.message ? form.message : "Would love a walkthrough / early access for my agency.",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    if (hasWhatsapp) {
      window.open(
        `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(body)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      const subject = `Demo request${form.agencyName ? ` — ${form.agencyName}` : ""}`;
      window.open(
        `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }

    setSubmitted(true);
  }

  return (
    <section id="contact" className="relative py-32 overflow-hidden bg-[#050505] scroll-mt-24">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-5">
            Get started &middot; Early access
          </h2>
          <h3 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.95] mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500">
            Let&apos;s put your agency on the network.
          </h3>
          <p className="text-white/40 font-medium tracking-tight leading-relaxed max-w-lg mx-auto">
            Book a walkthrough or claim a founding-agency spot &mdash; tell us a bit about your fleet
            and we&apos;ll reply fast. No sales deck, just a real look at the product.
          </p>
        </div>

        <Card
          variant="default"
          padding="none"
          className="max-w-5xl mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Path 1: quick contact */}
            <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">
                Quick contact
              </h4>

              <div className="space-y-3">
                {hasWhatsapp ? (
                  <a
                    href={quickWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      PILL_CLASSES,
                      "bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5c]",
                    )}
                  >
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    Chat on WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={cn(
                      PILL_CLASSES,
                      "border border-dashed border-white/15 text-white/40 cursor-not-allowed hover:scale-100",
                    )}
                  >
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    WhatsApp &mdash; coming soon
                  </button>
                )}

                <a
                  href={quickEmailHref}
                  className={cn(
                    PILL_CLASSES,
                    hasWhatsapp
                      ? "border border-white/15 text-white hover:bg-white/5"
                      : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
                  )}
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Email us
                </a>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-white/50 shrink-0" aria-hidden="true" />
                  <a
                    href={`mailto:${email}`}
                    className="text-sm font-bold text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
                  >
                    {email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-white/50 shrink-0" aria-hidden="true" />
                  {hasWhatsapp ? (
                    <a
                      href={quickWhatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white/70 hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
                    >
                      {whatsapp}
                    </a>
                  ) : (
                    <span className="text-sm font-bold text-white/50">WhatsApp &mdash; coming soon</span>
                  )}
                </div>
              </div>

              <p className="mt-auto pt-8 text-[11px] font-medium text-white/40 leading-relaxed">
                We usually reply within a day. Nothing here is sent anywhere until you tap a button
                &mdash; your details stay in your browser.
              </p>
            </div>

            {/* Path 2: short form */}
            <div className="p-8 md:p-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">
                Or send us the details
              </h4>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor={`${uid}-name`}>
                      Full name <span className="text-primary" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id={`${uid}-name`}
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. Yasmine El Amrani"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${uid}-agency`}>
                      Agency name <span className="text-primary" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id={`${uid}-agency`}
                      name="agencyName"
                      type="text"
                      autoComplete="organization"
                      required
                      value={form.agencyName}
                      onChange={(e) => updateField("agencyName", e.target.value)}
                      placeholder="e.g. Atlas Rent A Car"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor={`${uid}-email`}>
                      Email <span className="text-primary" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id={`${uid}-email`}
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@agency.ma"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${uid}-phone`}>
                      Phone <span className="text-white/50 font-normal normal-case">(optional)</span>
                    </Label>
                    <Input
                      id={`${uid}-phone`}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+212 6 12 34 56 78"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${uid}-message`}>
                    Message <span className="text-white/50 font-normal normal-case">(optional)</span>
                  </Label>
                  <textarea
                    id={`${uid}-message`}
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    placeholder="Fleet size, city, what you'd want to see in a walkthrough..."
                    className={TEXTAREA_CLASSES}
                  />
                </div>

                <Button type="submit" className="w-full h-12">
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Send message
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>

                <div role="status" aria-live="polite" className="min-h-[1.5rem]">
                  {submitted && (
                    <p className="flex items-center gap-2 text-sm font-bold text-success">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Thanks &mdash; opening your messenger. We usually reply within a day.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
