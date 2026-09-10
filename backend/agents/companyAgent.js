const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const PREDICT_SCRIPT = path.join(PROJECT_ROOT, "ml", "predict_company.py");
const VENV_PYTHON = path.join(PROJECT_ROOT, "ml", ".venv", "bin", "python");
const PYTHON_EXEC = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

function runCompanyModel(company) {
  return new Promise((resolve, reject) => {
    const process = spawn(PYTHON_EXEC, [PREDICT_SCRIPT]);
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => (stdout += data.toString()));
    process.stderr.on("data", (data) => (stderr += data.toString()));
    process.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `Company model exited ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Bad JSON from predict_company.py: ${stdout}`));
      }
    });

    process.stdin.write(JSON.stringify({
      company_name: company.companyName,
      url: company.url,
    }));
    process.stdin.end();
  });
}

module.exports = { runCompanyModel };