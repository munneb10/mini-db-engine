
import * as readline from "readline";
import { MiniDB } from "./db/database";

const db = new MiniDB("data.db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "mini-db> "
});

console.log("Welcome to MiniDB (B+ tree demo)");
console.log("Commands:");
console.log("  put <key> <value>");
console.log("  get <key>");
console.log("  range <start> <end>");
console.log("  exit");
console.log("");

rl.prompt();

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }

  const [cmd, ...args] = trimmed.split(" ");

  try {
    switch (cmd.toLowerCase()) {
      case "put": {
        if (args.length < 2) {
          console.log("Usage: put <key> <value>");
        } else {
          const key = Number(args[0]);
          const value = args.slice(1).join(" ");
          if (Number.isNaN(key)) {
            console.log("Key must be a number.");
          } else {
            db.put(key, value);
            console.log(`OK: inserted key=${key}, value="${value}"`);
          }
        }
        break;
      }

      case "get": {
        if (args.length !== 1) {
          console.log("Usage: get <key>");
        } else {
          const key = Number(args[0]);
          if (Number.isNaN(key)) {
            console.log("Key must be a number.");
          } else {
            const value = db.get(key);
            if (value === null) {
              console.log("(not found)");
            } else {
              console.log(`value="${value}"`);
            }
          }
        }
        break;
      }

      case "range": {
        if (args.length !== 2) {
          console.log("Usage: range <start> <end>");
        } else {
          const start = Number(args[0]);
          const end = Number(args[1]);
          if (Number.isNaN(start) || Number.isNaN(end)) {
            console.log("Start and end must be numbers.");
          } else {
            const rows = db.range(start, end);
            if (rows.length === 0) {
              console.log("(empty)");
            } else {
              for (const row of rows) {
                console.log(`${row.key} -> "${row.value}"`);
              }
            }
          }
        }
        break;
      }

      case "exit":
      case "quit": {
        rl.close();
        return;
      }

      default:
        console.log("Unknown command. Use: put, get, range, exit");
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("\nClosing database...");
  db.close();
  console.log("Bye!");
  process.exit(0);
});
