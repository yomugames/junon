Junon
=======
Junon is a co-op survival game where your goal is to build your own
space-station, grow your colony, and defend it against hostile threats. It runs
offline as a desktop app, and any player can open their world to friends.

Installation (linux)
--------
1. Install Node.js 26.4.0 (ideally using [nvm](https://github.com/nvm-sh/nvm) )
2. Install project dependencies

        cd ~/junon
        npm install

Running
--------
Run client

    npm run client

Run server

    npm run server
    Go to http://localhost:8001 to play in a browser

Run the desktop app

    NODE_ENV=standalone npm run client:build
    npm run desktop

See [docs/development.md](docs/development.md) for details.

Debugging
---------

    Enter "chrome://inspect/" in chrome browser
    Click "Open dedicated DevTools for Node"

Contributing
---------

  See https://www.youtube.com/channel/UCMuok-F6ElORq7aKyyFDgqw for tutorials related to running/contributing
