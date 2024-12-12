# IUT RCC Grades Tracker

A tool to automatically fetch your grades from the [IUT RCC university portal](https://iut-rcc-intranet.univ-reims.fr/) and send a detailed summary to your Discord.

The tracker periodically retrieves your new grades and delivers them in an easy-to-read Discord embed format, keeping you informed of your academic progress.

## Table of Contents

-   [Installation](#installation)
-   [Configuration](#configuration)
-   [Usage](#usage)
-   [Docker](#docker)
-   [Copyright](#copyright)

## Installation

You can [use Docker](#docker) or install this app manually. Here's how:

1. Install [Node.js](https://nodejs.org/).
2. Download or clone the project.
3. Navigate to the project directory.
4. Install the dependencies:
    ```sh
    npm install
    ```
5. Build the project:
    ```sh
    npm run build
    ```

## Configuration

The configuration details must be set inside a `.env` file at the root of the project. An exemple is provided inside [`.env.example`](./.env.example).

## Usage

To start the application, run:

```sh
npm start
```

## Docker

Alternatively, you can use Docker to set up and run the project:

1. Build the Docker image:
    ```sh
    docker build -t iut-rcc-grades-tracker .
    ```
2. Run the Docker container:
    ```sh
    docker run --env-file .env iut-rcc-grades-tracker
    ```

## Copyright

See the [license](/LICENSE).
