// SPDX-License-Identifier: MIT
import createDOMPurify from "dompurify";

const DOMPurify = createDOMPurify(window);
DOMPurify.setConfig({
  ADD_ATTR: ["target", "rel"],
  // Explicitly block dangerous URI schemes in href/src attributes.
  // Allows: http(s), mailto, tel, callto, sms, cid, xmpp, relative URLs,
  // and data:image/* (for inline image attachments). Blocks: javascript:,
  // vbscript:, data:text/html, data:image/svg+xml (SVG can carry JS).
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|data:image\/(?!svg)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
});

export default DOMPurify;
