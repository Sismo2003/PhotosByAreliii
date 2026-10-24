// "Text Areli" (sms: + E.164) and "Instagram" — contact details come from shared/site.js, the one place
// the landing and the portal read them from. A button whose detail is missing isn't shown.
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

import { BRAND, CONTACT, SOCIAL } from "@shared/site";
import { toE164 } from "utils/phone";

const smsTo = toE164(CONTACT.phoneE164);

export function ContactActions({ className }) {
  const { t } = useTranslation();
  if (!smsTo && !SOCIAL.instagram) return null;
  const button = "caps flex min-h-12 flex-1 items-center justify-center gap-2 border border-line px-4 text-ink transition-colors hover:border-ink";
  return (
    <div className={clsx("flex gap-2", className)}>
      {smsTo && (
        <a href={`sms:${smsTo}`} className={button}>
          <ChatBubbleLeftRightIcon className="size-5" aria-hidden="true" />
          {t("contact.text", { name: BRAND.owner })}
        </a>
      )}
      {SOCIAL.instagram && (
        <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className={button}>
          {t("contact.instagram")}
        </a>
      )}
    </div>
  );
}
