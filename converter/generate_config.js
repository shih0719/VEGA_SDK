
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const INPUT_FILE = path.join(__dirname, 'device_config.xlsx');
const OUTPUT_FILE = path.join(__dirname, '..', 'config_map.json');
const SHEET_NAME = 'devices'; // The name of the sheet in your Excel file

// --- Main Conversion Logic ---
try {
  // 1. Read the Excel file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: Input file not found at ${INPUT_FILE}`);
    console.error("Please make sure 'device_config.xlsx' exists in the 'converter' directory.");
    process.exit(1);
  }
  const workbook = xlsx.readFile(INPUT_FILE);
  const worksheet = workbook.Sheets[SHEET_NAME];
  if (!worksheet) {
    console.error(`Error: Sheet '${SHEET_NAME}' not found in the Excel file.`);
    console.error(`Available sheets: ${Object.keys(workbook.Sheets).join(', ')}`);
    process.exit(1);
  }

  // 2. Convert sheet to JSON
  const rows = xlsx.utils.sheet_to_json(worksheet);

  // 3. Process rows and group by device topic
  const devices = new Map();

  for (const row of rows) {
    // Check for required columns
    if (!row.Domain || !row.Gateway || !row.Device || !row.Device_Type || !row.Channel_Name || row.Channel_Value === undefined) {
        console.warn('Skipping incomplete row:', row);
        continue;
    }

    const topic = `${row.Domain}/${row.Gateway}/${row.Device}`;

    if (!devices.has(topic)) {
      devices.set(topic, {
        type: row.Device_Type,
        channels: {},
      });
    }

    const device = devices.get(topic);
    // Ensure device type is consistent for the same topic
    if (device.type !== row.Device_Type) {
        console.warn(`Warning: Inconsistent Device_Type for topic ${topic}. Using first encountered type '${device.type}'.`);
    }

    device.channels[row.Channel_Name] = row.Channel_Value;
  }

  // 4. Format the data into the final config_map.json structure
  const finalConfig = Array.from(devices.entries());

  // 5. Write the output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalConfig, null, 2));

  console.log(`Successfully generated 'config_map.json' from '${path.basename(INPUT_FILE)}'.`);
  console.log(`Output written to: ${OUTPUT_FILE}`);

} catch (error) {
  console.error("An error occurred during the conversion process:", error);
  process.exit(1);
}
