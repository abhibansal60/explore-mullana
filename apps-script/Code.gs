// Explore Mullana: listing Form -> private Sheet -> approved rows as JSON.
//
// Setup (once, as abhibansal60@gmail.com, at script.google.com):
//   1. New project, paste this file, run setup(). It creates the Form and the
//      Sheet and logs both URLs.
//   2. Deploy > New deployment > Web app, execute as me, access: anyone.
//      Put the /exec URL in .sheet-url and run `npm run sheet`.
// To publish a listing, tick its "Approved" box in the Sheet. Only approved
// rows, and only the public columns, ever leave the Sheet. A contributor's name
// is shown as a credit; their number stays private.

// Keys must match `categories` in src/data/index.ts.
const CATEGORIES = [
  ["food", "Food & chai (खाना और चाय)"],
  ["grocery", "Groceries (किराना)"],
  ["general", "General store (जनरल स्टोर)"],
  ["print", "Stationery & print (स्टेशनरी)"],
  ["salon", "Salon & grooming (सैलून)"],
  ["medical", "Medical & pharmacy (दवाई)"],
  ["mobile", "Mobile & repairs (मोबाइल)"],
  ["clothing", "Clothing & tailoring (कपड़े)"],
  ["jewellery", "Jewellers (ज्वेलर्स)"],
  ["education", "Schools & coaching (पढ़ाई)"],
  ["hardware", "Hardware (हार्डवेयर)"],
  ["auto", "Auto & tyres (गाड़ी)"],
  ["fuel", "Petrol pumps (पेट्रोल पंप)"],
  ["bank", "Banks & ATMs (बैंक)"],
  ["transport", "Transport (सवारी)"],
  ["sports", "Gym & sports (जिम)"],
  ["services", "Services (सेवाएँ)"],
  ["places", "Places (जगहें)"],
];

const Q = {
  name: "Shop name, as on the board",
  category: "Category",
  about: "What do they sell or do?",
  owner: "Owner's name",
  phones: "Phone numbers to show",
  whatsapp: "Is the first number on WhatsApp?",
  location: "Location",
  open: "Opens at",
  close: "Closes at",
  consent: "Owner's permission",
  by: "Your name",
  byPhone: "Your WhatsApp number",
};
const EXTRA = ["Approved", "Slug", "Verified (YYYY-MM)"];

function setup() {
  const ss = SpreadsheetApp.create("Explore Mullana listings");
  const form = FormApp.create("Add a shop to Explore Mullana")
    .setDescription(
      "Add a shop or place in Mullana to mullana.abhibansal.dev. Only add phone numbers the owner has agreed to show. " +
        "Nothing goes live until it has been checked.",
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false);

  form.addTextItem().setTitle(Q.name).setRequired(true);
  form.addListItem().setTitle(Q.category).setChoiceValues(CATEGORIES.map((c) => c[1])).setRequired(true);
  form.addParagraphTextItem().setTitle(Q.about).setHelpText("One line, e.g. Bakery and cake shop.").setRequired(true);
  form.addTextItem().setTitle(Q.owner);
  form.addTextItem().setTitle(Q.phones).setHelpText("One or more numbers, separated by commas.").setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.whatsapp).setChoiceValues(["Yes", "No"]).setRequired(true);
  form.addTextItem()
    .setTitle(Q.location)
    .setHelpText("Paste the shop's Google Maps link, or drop a pin and paste the coordinates.")
    .setRequired(true);
  form.addTimeItem().setTitle(Q.open).setRequired(true);
  form.addTimeItem().setTitle(Q.close).setRequired(true);
  form.addCheckboxItem()
    .setTitle(Q.consent)
    .setChoiceValues(["The owner agreed to show these details on the site"])
    .setRequired(true);
  form.addTextItem().setTitle(Q.by).setHelpText("Shown as a contributor credit.").setRequired(true);
  form.addTextItem().setTitle(Q.byPhone).setHelpText("Private. Only used to thank you.").setRequired(true);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  const sheet = responses_(ss);
  const col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col, 1, EXTRA.length).setValues([EXTRA]).setFontWeight("bold");
  sheet.getRange(2, col, 999, 1).insertCheckboxes();
  PropertiesService.getScriptProperties().setProperty("SHEET_ID", ss.getId());
  const blank = ss.getSheetByName("Sheet1");
  if (blank) ss.deleteSheet(blank);

  Logger.log("Form: " + form.getPublishedUrl());
  Logger.log("Form (edit): " + form.getEditUrl());
  Logger.log("Sheet: " + ss.getUrl());
}

function responses_(ss) {
  return ss.getSheets().find((s) => s.getFormUrl()) || ss.getSheets()[0];
}

function doGet() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("SHEET_ID"));
  const [head, ...rows] = responses_(ss).getDataRange().getValues();
  const at = (title) => head.indexOf(title);
  const cell = (r, title) => (at(title) < 0 ? "" : r[at(title)]);
  const keyOf = (label) => (CATEGORIES.find((c) => c[1] === label) || [label])[0];
  const hhmm = (v) =>
    v instanceof Date ? Utilities.formatDate(v, "Asia/Kolkata", "HH:mm") : String(v).slice(0, 5);

  const shops = rows
    .filter((r) => cell(r, "Approved") === true)
    .map((r) => ({
      name: String(cell(r, Q.name)).trim(),
      category: keyOf(cell(r, Q.category)),
      about: String(cell(r, Q.about)).trim(),
      owner: String(cell(r, Q.owner)).trim(),
      phones: String(cell(r, Q.phones)),
      whatsapp: cell(r, Q.whatsapp) === "Yes",
      location: String(cell(r, Q.location)).trim(),
      open: hhmm(cell(r, Q.open)),
      close: hhmm(cell(r, Q.close)),
      // Sheets turns a typed "2026-09" into a date, so format whatever is there.
      verified: Utilities.formatDate(
        new Date(cell(r, "Verified (YYYY-MM)") || cell(r, "Timestamp")),
        "Asia/Kolkata",
        "yyyy-MM",
      ),
      slug: String(cell(r, "Slug")).trim(),
      by: String(cell(r, Q.by)).trim(),
    }));
  return ContentService.createTextOutput(JSON.stringify({ shops })).setMimeType(ContentService.MimeType.JSON);
}
