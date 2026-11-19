My Bookcase
A personal book journal built with Node.js, Express, EJS, and PostgreSQL. Keep track of books you have read, your notes, ratings, and reading dates.

Created as Capstone Project - Book Notes.
Features
- Add, view, edit, and delete book entries.
- Record a title, author, optional ISBN, notes, rating from 1 to 10, and date read.
- Sort your library by highest rating, most recently read, or title A–Z.
- Automatically look up book covers when adding or editing books.
- Search Open Library by ISBN first, then fall back to title and author.
- Save books without covers when a cover is unavailable or the API fails.
- Confirm before deleting a book.
- Responsive layout with a dark green background, cream typography, and mint accents.
Tech stack
- Node.js and Express — server and routes
- EJS — HTML templates
- PostgreSQL and pg — persistent storage
- Axios — requests to Open Library
- dotenv — local environment configuration
- HTML and CSS — interface and responsive styling
Project structure
Capstone Project - Book Notes/
├── public/
│   └── style.css
├── views/
│   ├── index.ejs
│   └── book.ejs
├── index.js
├── .env                 # Local credentials; not committed
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
Prerequisites
- Node.js with npm installed. The application uses ES modules and top-level await; Node.js 24 is suitable for this project.
- A running PostgreSQL server.
- pgAdmin or another PostgreSQL client to create the database and table.
- Internet access for cover lookup and image loading. No Open Library API key is required.
Local setup
1. Install dependencies
Open a terminal in the project directory and run:
npm install
The project uses express, ejs, pg, axios, and dotenv. Ensure package.json contains the following top-level property:
"type": "module"
If needed, set it with:
npm pkg set type=module
2. Create the database
In pgAdmin, create a database named books. Alternatively, execute this command while connected to an existing database outside a transaction:
CREATE DATABASE books;
Connect to the new books database, then run:
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn VARCHAR(13),
    notes TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 10),
    date_read DATE,
    cover_id INTEGER
);
The database and its table are both named books. Run this schema on a new database; if you already created the table during development, you do not need to create it again. If an existing table is only missing the cover column, run:
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_id INTEGER;
isbn is stored as text because it is an identifier. date_read stores a date without a time. cover_id stores an Open Library cover ID, not image data. No separate tables or relationships are required.
3. Configure environment variables
Create a .env file in the project root:
PGUSER=postgres
PGHOST=localhost
PGDATABASE=books
PGPASSWORD='your_postgresql_password'
PGPORT=5432
Replace the username and password with your local PostgreSQL credentials. Use one setting per line without commas or semicolons. dotenv loads these settings before the application creates its PostgreSQL connection pool.

Ensure .gitignore includes:
node_modules/
.env
Commit package.json and package-lock.json; keep actual credentials out of the repository.
4. Start the server
node index.js
For automatic restarts during development, install nodemon if needed and run:
npm install --save-dev nodemon
npx nodemon index.js
Open http://localhost:3000. The application currently uses port 3000 as configured in index.js.
Usage
1. Click + Add book to jump to the form.
2. Enter the book's title, author, rating, notes, and date read. ISBN is optional.
3. Click Save book. The server looks up a cover and saves the entry to PostgreSQL.
4. Click a title to view details and edit the entry.
5. Use the sorting dropdown to reorder the library.
6. Use Delete book on the details page and confirm to remove an entry.
Routes
Method	Route	Purpose
GET	/	Display the library; accepts sort=rating, sort=recency, or sort=title
GET	/books/:id	Display one book and its edit form
POST	/add-book	Look up a cover and create a book
POST	/books/:id/edit	Look up a cover and update a book
POST	/books/:id/delete	Delete a book
GET	/find-cover	Look up a cover and return its ID as JSON


The cover lookup endpoint accepts isbn, title, and author query parameters. Provide an ISBN or a title; the author helps narrow title searches.

Example:
http://localhost:3000/find-cover?title=Atomic%20Habits&author=James%20Clear
It returns an object containing coverId, which is a number when a cover is found or null otherwise. It does not save an entry.
Open Library integration
The server uses Axios to call the Open Library Search API at https://openlibrary.org/search.json. It tries ISBN first and then title and author, examining up to five results per search for a cover_i value. The first result with a cover is selected.

EJS templates use the saved ID to load images directly from the Open Library Covers API:
https://covers.openlibrary.org/b/id/COVER_ID-L.jpg
Each search request has a 10-second timeout. Saving can take longer when both search attempts are needed. Lookup errors are logged and the book can still be saved without a cover. Title searches may select a different edition or an incorrect match. Editing a book runs the lookup again and can replace the previous cover ID, including with NULL if no cover is found.

Book data and covers are provided by Open Library.
Troubleshooting
- Cannot use import statement outside a module: check that package.json has "type": "module".
- Database connection or password error: check that PostgreSQL is running and the .env values match your local setup. Restart the server after changing .env.
- Relation or column does not exist: check that the application connects to the books database and that the table matches the schema above.
- Unable to save, update, or delete a book: inspect the terminal running the server for the specific error message.
- Missing cover: try an ISBN for the intended edition. Not every book has a cover in Open Library.
- Port 3000 already in use: stop the other server or change const port in index.js.
Project scope
This is a personal learning project intended for local use. It has no user accounts or authentication. HTML form constraints and database constraints provide basic checks; comprehensive server-side validation and production hardening are future improvements.