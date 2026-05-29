# PikiWO - magazin online conectat la MySQL Workbench

Site-ul foloseste baza MySQL `Pikowoo` pentru:
- utilizatori: nume complet, email, parola criptata
- produse: toate hainele din catalog

## Pornire

1. Deschide MySQL Workbench si asigura-te ca serverul MySQL este pornit.
2. Porneste fisierul:

```powershell
server\start.bat
```

3. Deschide in browser:

```text
http://localhost:3000
```

Serverul creeaza automat baza `Pikowoo`, tabelele `users` si `products`, apoi incarca produsele din `server/seed/products.json` daca tabela este goala.

## Setari MySQL

Setarile sunt in `server/.env`:

```text
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=...
MYSQL_DATABASE=Pikowoo
```

Daca in MySQL Workbench folosesti alt utilizator decat `root`, schimba `MYSQL_USER`.

## Comenzi utile

```powershell
cd "C:\Users\Admin\OneDrive\Personal\practica anul 3\server"
npm install
npm run export-products
npm run init-db
npm start
```

## API

- `GET /api/products` - toate produsele
- `GET /api/products?category=Fete` - produse dupa categorie
- `GET /api/products/:id` - un produs
- `GET /api/products-search?q=...&category=...` - cautare
- `POST /api/auth/register` - creare cont
- `POST /api/auth/login` - autentificare
