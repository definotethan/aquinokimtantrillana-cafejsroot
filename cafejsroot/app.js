const express = require('express')
const ejs = require('ejs')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')
const database = require('./database.js')
const app = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use((req, res, next) => {
    console.log('Cookies received:', req.cookies);
    console.log('Session cookie:', req.cookies['cafejs_session']);
    next();
});
app.get('/', async (req, res) => {
    let products = await database.getProducts()
    let sessionToken = req.cookies['cafejs_session']
    let user = await database.getUserBySessionToken(sessionToken)
    let data = {
        products: products,
        user: user,
    }
    ejs.renderFile('views/index.ejs', data, (err, str) => {
        res.send(str)
    })
})

app.get('/product/:productId', async (req, res) => {
    let product = await database.getProductById(req.params.productId)
    let data = {product: product}
    ejs.renderFile('views/product_detail.ejs', data, (err, str) => {
        res.send(str)
    })
})
app.post('/product/:productId', async (req, res) => {
    let sessionToken = req.cookies['cafejs_session']
    let user = await database.getUserBySessionToken(sessionToken)
    let userId = user.id
    let quantity = req.body.quantity
    let productId = req.body.product_id
    await database.createCartItem(productId, quantity, userId)
    res.redirect('/')
})

app.get('/login', async (req, res) => {
    ejs.renderFile('views/login.ejs', (err, str) => {
        res.send(str)
    })
})
app.post('/login', async (req, res) => {
    let user = await database.getUserByUsername(req.body.username)
    if (user.password != req.body.password) {
        res.send('Invalid details!')
    }
    let sessionToken = crypto.randomBytes(16).toString('base64')
    res.cookie('cafejs_session', sessionToken)
    await database.setSession(sessionToken, user.id)
    res.redirect('/')
})

app.get('/cart', async (req, res) => {
    let sessionToken = req.cookies['cafejs_session']
    let user = await database.getUserBySessionToken(sessionToken)
    let cartItems = await database.getCartItemsByUser(user)
    let data = {
        user: user,
        cartItems: cartItems,
    }
    ejs.renderFile('views/cart.ejs', data, (err, str) => {
        res.send(str)
    })
})
app.post('/cart', async (req, res) => {
    let userId = req.body.user_id
    userId = Number(userId)
    let user = await database.getUserById(userId)
    let cartItems = await database.getCartItemsByUser(user)
    await database.checkoutCartForUser(user)
    res.send({
        user: user,
        cartItems: cartItems
    })
})

app.get('/username', async (req, res) => {
    res.send(req.cookies.cafejs_username)
})

app.listen(port, () => console.log('App is listening'))