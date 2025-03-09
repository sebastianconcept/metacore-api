#!/usr/bin/env node
/**
 * Helper script to integrate Lerna and Nomad for intelligent deployments
 *
 * This script analyzes which packages have changed since the last deployment
 * and triggers deployment only for the affected services.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Mapping from packages to Nomad services
const PACKAGE_TO_SERVICE = {
  "payments-service": "payments",
  "sales-service": "sales",
  "purchasing-service": "purchasing",
  "inventory-service": "inventory",
  "customer-activity-service": "customer",
  "user-service": "user",
  shared: null, // Special package that affects all services
};

// Configuration
const DEPLOY_SCRIPT = path.join(__dirname, "deploy.sh");

/**
 * Gets the list of packages changed since the last tag
 * @returns {Array<string>} List of changed packages
 */
function getChangedPackages() {
  try {
    const output = execSync("npx lerna changed --json", { encoding: "utf8" });
    return JSON.parse(output).map((pkg) => pkg.name);
  } catch (error) {
    // If there are no changes, the lerna command returns an error
    if (
      error.status === 1 &&
      error.stderr.includes("No changed packages found")
    ) {
      console.log("No packages have changed since the last deployment.");
      return [];
    }
    throw error;
  }
}

/**
 * Determines which services need to be deployed
 * @param {Array<string>} changedPackages List of changed packages
 * @returns {Array<string>} List of services that need to be deployed
 */
function getServicesToDeploy(changedPackages) {
  // If the shared package was changed, all services should be deployed
  if (changedPackages.includes("shared")) {
    return Object.values(PACKAGE_TO_SERVICE).filter(
      (service) => service !== null
    );
  }

  // Otherwise, only the services corresponding to the changed packages
  return changedPackages
    .map((pkg) => PACKAGE_TO_SERVICE[pkg])
    .filter((service) => service !== null && service !== undefined);
}

/**
 * Executes the deployment of services
 * @param {Array<string>} services List of services to deploy
 * @param {Object} options Deployment options
 */
function deployServices(services, options = {}) {
  const { tag = "latest", environment = "dev" } = options;

  if (services.length === 0) {
    console.log("No services to deploy.");
    return;
  }

  console.log(`Deploying services: ${services.join(", ")}`);

  services.forEach((service) => {
    try {
      const command = `${DEPLOY_SCRIPT} -e ${environment} -t ${tag} ${service}`;
      console.log(`Executing: ${command}`);
      execSync(command, { stdio: "inherit" });
    } catch (error) {
      console.error(`Error deploying service ${service}:`, error);
      process.exit(1);
    }
  });
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    tag: "latest",
    environment: "dev",
    forceAll: false,
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--tag":
      case "-t":
        options.tag = args[++i];
        break;
      case "--environment":
      case "-e":
        options.environment = args[++i];
        break;
      case "--all":
      case "-a":
        options.forceAll = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: node nomad-helpers.js [options]

Options:
  --tag, -t [tag]               Docker image tag
  --environment, -e [env]       Environment (dev, staging, prod)
  --all, -a                     Force deployment of all services
  --help, -h                    Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  if (options.forceAll) {
    // Deploy all services
    const allServices = Object.values(PACKAGE_TO_SERVICE).filter(
      (service) => service !== null
    );
    deployServices(allServices, options);
  } else {
    // Deploy only changed services
    const changedPackages = getChangedPackages();
    console.log("Changed packages:", changedPackages);

    const servicesToDeploy = getServicesToDeploy(changedPackages);
    console.log("Services to deploy:", servicesToDeploy);

    deployServices(servicesToDeploy, options);
  }
}

// Execute the script
main();
