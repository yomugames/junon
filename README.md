

Junon.io
=======
Junon.io is a co-op multiplayer survival game where your goal is to build your own space-station, grow your colony, and defend it against hostile threats.

Installation
--------
1. Install Node.js 16.15.0 (ideally using [nvm](https://github.com/nvm-sh/nvm) )
2. Install MySQL
3. Install project dependencies

        cd ~/junon
        npm install

4. Setup database using the command below. It is assumed that your mysql user is 'root' with empty password. To override this, define `JUNON_DB_USER` and `JUNON_DB_PASS` environment variable. For example

        npm run db:setup


Running
--------
Run client

    npm run client

Run server

    npm run server
    Go to http://localhost:8001 to access Junon io homepage

Debugging
---------

    Enter "chrome://inspect/" in chrome browser
    Click "Open dedicated DevTools for Node"

Contributing
---------

  See [contribution guidelines](https://github.com/yomugames/junon/wiki)
