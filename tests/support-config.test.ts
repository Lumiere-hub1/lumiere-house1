import { describe, expect, it } from "vitest";
import { normaliseTelegramUsername, normaliseWhatsappNumber } from "../shared/support";

/**
 * These cover the forms an operator actually pastes. Both real values supplied
 * for this project arrived as full URLs, which the previous code would have
 * turned into https://t.me/https://t.me/lumiere_housebot.
 */
describe("Telegram username normalisation", () => {
  it("accepts the full URL form", () => {
    expect(normaliseTelegramUsername("https://t.me/lumiere_housebot")).toBe("lumiere_housebot");
  });

  it("accepts the bare username, an @ prefix, and a host without a scheme", () => {
    expect(normaliseTelegramUsername("lumiere_housebot")).toBe("lumiere_housebot");
    expect(normaliseTelegramUsername("@lumiere_housebot")).toBe("lumiere_housebot");
    expect(normaliseTelegramUsername("t.me/lumiere_housebot")).toBe("lumiere_housebot");
    expect(normaliseTelegramUsername("http://www.telegram.me/lumiere_housebot")).toBe("lumiere_housebot");
  });

  it("drops a query string or fragment", () => {
    expect(normaliseTelegramUsername("https://t.me/lumiere_housebot?start=abc")).toBe("lumiere_housebot");
  });

  it("stays empty when unset, so the channel hides rather than linking nowhere", () => {
    expect(normaliseTelegramUsername("")).toBe("");
    expect(normaliseTelegramUsername("   ")).toBe("");
  });
});

describe("WhatsApp number normalisation", () => {
  it("accepts the full wa.me URL", () => {
    expect(normaliseWhatsappNumber("https://wa.me/17426660496")).toBe("17426660496");
  });

  it("accepts a human-formatted number", () => {
    expect(normaliseWhatsappNumber("+1 742-666-0496")).toBe("17426660496");
    expect(normaliseWhatsappNumber("(1) 742 666 0496")).toBe("17426660496");
  });

  it("strips the host before extracting digits", () => {
    // Extracting digits first would fold any digit in the host into the
    // number. api.whatsapp.com has none today, but the ordering is the point.
    expect(normaliseWhatsappNumber("https://api.whatsapp.com/send?phone=17426660496")).toBe("17426660496");
  });

  it("stays empty when unset", () => {
    expect(normaliseWhatsappNumber("")).toBe("");
  });
});
