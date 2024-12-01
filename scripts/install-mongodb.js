/* eslint-disable @typescript-eslint/no-require-imports */

const shell = require('shelljs');
const os = require('os');
const fs = require('fs');

/**
 * Installs MongoDB based on the operating system platform.
 * Supports Windows, macOS, and select Linux distributions (Ubuntu, Debian, CentOS, RHEL).
 */
function installMongoDB() {
  const operatingSystem = os.platform();

  switch (operatingSystem) {
    case 'win32':
      console.log('Installing MongoDB for Windows...');
      shell.exec('choco install mongodb', { silent: false });
      break;

    case 'darwin':
      console.log('Installing MongoDB for macOS...');
      shell.exec(
        'brew tap mongodb/brew && brew install mongodb-community@5.0',
        { silent: false },
      );
      break;

    case 'linux':
      console.log('Installing MongoDB for Linux...');
      installMongoDBForLinux();
      break;

    default:
      console.log('Unsupported OS. Please install MongoDB manually.');
      break;
  }
}

/**
 * Handles MongoDB installation for Linux distributions.
 * Supports Ubuntu, Debian, CentOS, and RHEL distributions.
 */
function installMongoDBForLinux() {
  const linuxReleaseInfo = shell.exec('cat /etc/os-release', {
    silent: true,
  }).stdout;

  if (
    linuxReleaseInfo.includes('Ubuntu') ||
    linuxReleaseInfo.includes('Debian')
  ) {
    console.log('Configuring MongoDB repository for Ubuntu/Debian...');
    configureMongoDBForUbuntuDebian();
  } else if (
    linuxReleaseInfo.includes('CentOS') ||
    linuxReleaseInfo.includes('RHEL')
  ) {
    console.log('Configuring MongoDB repository for CentOS/RHEL...');
    configureMongoDBForCentOSRHEL();
  } else {
    console.log(
      'Unsupported Linux distribution. Please install MongoDB manually.',
    );
  }
}

/**
 * Configures and installs MongoDB for Ubuntu or Debian-based systems.
 */
function configureMongoDBForUbuntuDebian() {
  // Add MongoDB's GPG key and repository
  shell.exec(
    `wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo tee /etc/apt/trusted.gpg.d/mongodb.gpg > /dev/null && \
     echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list`,
  );

  // Install libssl1.1, required for MongoDB installation
  const libsslPackagePath = 'libssl1.1_1.1.1f-1ubuntu2_amd64.deb';
  shell.exec(
    `wget -O ${libsslPackagePath} http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb`,
  );
  shell.exec(`sudo dpkg -i ${libsslPackagePath}`);

  // Clean up the downloaded .deb file
  if (fs.existsSync(libsslPackagePath)) {
    fs.unlinkSync(libsslPackagePath);
    console.log(`${libsslPackagePath} has been removed after installation.`);
  }

  // Update package list and install MongoDB
  shell.exec('sudo apt-get update');
  shell.exec('sudo apt-get install -y mongodb-org');

  // Start and enable MongoDB service
  shell.exec('sudo systemctl start mongod');
  shell.exec('sudo systemctl enable mongod');
  console.log('MongoDB service started and enabled to run on boot.');
}

/**
 * Configures and installs MongoDB for CentOS or RHEL-based systems.
 */
function configureMongoDBForCentOSRHEL() {
  // Add MongoDB repository configuration
  shell.exec(
    `sudo tee -a /etc/yum.repos.d/mongodb-org-5.0.repo <<EOF
    [mongodb-org-5.0]
    name=MongoDB Repository
    baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/5.0/x86_64/
    gpgcheck=1
    enabled=1
    gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc
    EOF`,
  );

  // Install MongoDB
  shell.exec('sudo yum install -y mongodb-org');
}

installMongoDB();
