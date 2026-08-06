const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const INPUT_FILE = path.join(__dirname, "device_config.xlsx");
const OUTPUT_FILE = path.join(__dirname, "..", "configs", "config_map.json");
const DEVICE_LOGIC_FILE = path.join(
  __dirname,
  "..",
  "configs",
  "device_logic.json"
);
const SHEET_NAME = "devices"; // The name of the sheet in your Excel file

// deviceType -> ordered channel names, e.g. switch -> [switch_ch1..4]
// ponytail: register addresses are just an incrementing counter over this order
const FIELDS_BY_TYPE = new Map(
  JSON.parse(fs.readFileSync(DEVICE_LOGIC_FILE, "utf8")).map((t) => [
    t.deviceType,
    t.fields.map((f) => f.name),
  ])
);

// --- Main Conversion Logic ---
try {
  // 1. Read the Excel file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: Input file not found at ${INPUT_FILE}`);
    console.error(
      "Please make sure 'device_config.xlsx' exists in the 'converter' directory."
    );
    process.exit(1);
  }
  const workbook = xlsx.readFile(INPUT_FILE);
  const worksheet = workbook.Sheets[SHEET_NAME];
  if (!worksheet) {
    console.error(`Error: Sheet '${SHEET_NAME}' not found in the Excel file.`);
    console.error(
      `Available sheets: ${Object.keys(workbook.Sheets).join(", ")}`
    );
    process.exit(1);
  }

  // 2. Convert sheet to JSON
  const rows = xlsx.utils.sheet_to_json(worksheet);

  // 3. One row per device: Domain/Gateway/Device/Device_Type.
  // Channel names and register addresses are derived from device_logic.json,
  // not typed in the sheet.
  let nextAddr = 1;
  const finalConfig = [];

  for (const row of rows) {
    if (!row.Domain || !row.Gateway || !row.Device || !row.Device_Type) {
      console.warn("Skipping incomplete row:", row);
      continue;
    }

    const allFields = FIELDS_BY_TYPE.get(row.Device_Type);
    if (!allFields) {
      console.warn(
        `Skipping row with unknown Device_Type '${row.Device_Type}':`,
        row
      );
      continue;
    }

    // Optional Channel_Count column: how many of the type's ordered
    // channels this specific device actually has (e.g. a 2-way switch).
    // Defaults to all of them.
    const count = row.Channel_Count ? Number(row.Channel_Count) : allFields.length;
    if (!Number.isInteger(count) || count < 1 || count > allFields.length) {
      console.warn(
        `Skipping row with invalid Channel_Count '${row.Channel_Count}' for type '${row.Device_Type}' (max ${allFields.length}):`,
        row
      );
      continue;
    }

    const topic = `${row.Domain}/${row.Gateway}/${row.Device}`;
    const channels = {};
    for (const name of allFields.slice(0, count)) {
      channels[name] = nextAddr++;
    }

    finalConfig.push([topic, { type: row.Device_Type, channels }]);
  }

  // 5. Write the output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalConfig, null, 2));

  console.log(
    `Successfully generated 'config_map.json' from '${path.basename(
      INPUT_FILE
    )}'.`
  );
  console.log(`Output written to: ${OUTPUT_FILE}`);
} catch (error) {
  console.error("An error occurred during the conversion process:", error);
  process.exit(1);
}
