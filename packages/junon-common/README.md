Junon Common
======

To make changes and test it locally on junon-io and junon-matchmaker, use `yalc`

    npm install yalc -g

    in ~/junon-common
    yalc push

    in ~/junon-io
    yalc link junon-common --pure

create migrations
-------

    npx sequelize migration:generate --name xxx

run migrations
-------

    npx sequelize db:migrate
    npx sequelize db:migrate:undo

