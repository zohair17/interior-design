"use client";

import { useState } from "react";
import { site } from "@/lib/site";

const fields = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
];

/**
 * The closing beat. Nothing is wired to a backend yet — the submit handler
 * holds the message locally and says so, rather than pretending it was sent.
 */
export default function ContactForm({ chapter }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", message: "" });
  const [held, setHeld] = useState(false);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: post to the form endpoint once it exists.
    setHeld(true);
  };

  return (
    <div className="slide-copy contact-layout">
      <div className="contact-scrim" aria-hidden="true" />

      <div className="contact-intro">
        <p className="eyebrow">{chapter.eyebrow}</p>
        <h2 className="slide-head">{chapter.title}</h2>
        <p className="slide-lead">{chapter.lead}</p>

        <div className="contact-lines">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
        </div>

        <div className="contact-offices">
          {site.offices.map((office) => (
            <div key={office.label}>
              <p className="rule-label">{office.label}</p>
              <p>{office.lines.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>

      <form className="contact-form" onSubmit={onSubmit} noValidate>
        {fields.map((field) => (
          <label key={field.name} className="field">
            <span className="rule-label">{field.label}</span>
            <input
              type={field.type}
              name={field.name}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={set(field.name)}
              required={field.name !== "phone"}
            />
          </label>
        ))}

        <label className="field">
          <span className="rule-label">Your project</span>
          <textarea name="message" rows={3} value={values.message} onChange={set("message")} required />
        </label>

        <button type="submit" className="ghost-button contact-send">
          Send enquiry
        </button>

        <p className="contact-note" role="status">
          {held
            ? "Thank you — your enquiry is held in the form. Connect an endpoint to deliver it."
            : "We answer within one working day."}
        </p>
      </form>
    </div>
  );
}
