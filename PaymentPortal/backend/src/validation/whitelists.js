export const reObjectId = /^[a-f0-9]{24}$/i;

export const reUserQuery = /^[a-zA-Z0-9._\- ]{0,64}$/;         // username/fullName search
// validation/whitelists.js
export const reStatus = /^(created|pending_auth|sent|verified|completed)$/;
export const rePage = /^[1-9][0-9]{0,3}$/;
export const rePageSize = /^(10|20|50|100)$/;
export const reNote = /^[^<>{}]{0,200}$/;                      // basic “no-angle” note
