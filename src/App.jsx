import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'https://edz-student-hub.onrender.com'

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('access_token') || ''
  )

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('api_user')

    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  })

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    product_name: '',
    description: '',
    price: '',
    quantity: ''
  })

  const [editingId, setEditingId] = useState(null)

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    try {
      setLoginLoading(true)
      setLoginError('')

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      })

      const result = await response.json()

      if (!response.ok || !result.status) {
        throw new Error(
          result.message || result.error || 'Invalid username or password.'
        )
      }

      const accessToken = result.tokens?.access_token
      const loggedInUser = result.user

      if (!accessToken) {
        throw new Error('Login succeeded but no access token was returned.')
      }

      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('api_user', JSON.stringify(loggedInUser))

      setToken(accessToken)
      setUser(loggedInUser)

      setLoginForm({
        username: '',
        password: ''
      })

      setMessage('Login successful.')
      setError('')
    } catch (err) {
      setLoginError(
        err.message || 'Unable to connect to the authentication API.'
      )
    } finally {
      setLoginLoading(false)
    }
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('api_user')

    setToken('')
    setUser(null)

    setProducts([])
    setMessage('')
    setError('')
    setLoginError('')

    resetForm()
  }

  // ==========================================================
  // AUTHENTICATED API REQUEST
  // ==========================================================

  const authenticatedFetch = async (url, options = {}) => {
    const currentToken = localStorage.getItem('access_token')

    if (!currentToken) {
      handleLogout()
      throw new Error('You are not authenticated.')
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  const loadProducts = async () => {
    if (!token) {
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/products`,
        {
          method: 'GET'
        }
      )

      const result = await response.json()

      if (!response.ok || !result.status) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(
          result.message || result.error || 'Failed to load products.'
        )
      }

      setProducts(result.data || [])
    } catch (err) {
      setError(err.message || 'Unable to connect to the API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadProducts()
    }
  }, [token])

  // ==========================================================
  // PRODUCT FORM
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }))
  }

  const resetForm = () => {
    setForm({
      product_name: '',
      description: '',
      price: '',
      quantity: ''
    })

    setEditingId(null)
  }

  // ==========================================================
  // CREATE / UPDATE PRODUCT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setError('')
      setMessage('')

      const isEditing = editingId !== null

      const url = isEditing
        ? `${API_BASE_URL}/api/products/${editingId}`
        : `${API_BASE_URL}/api/products`

      const method = isEditing ? 'PUT' : 'POST'

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_name: form.product_name,
          description: form.description,
          price: Number(form.price),
          quantity: Number(form.quantity)
        })
      })

      const result = await response.json()

      if (!response.ok || !result.status) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(
          result.message || result.error || 'Request failed.'
        )
      }

      setMessage(
        isEditing
          ? 'Product updated successfully.'
          : 'Product created successfully.'
      )

      resetForm()
      await loadProducts()
    } catch (err) {
      setError(err.message || 'Unable to save product.')
    }
  }

  // ==========================================================
  // EDIT PRODUCT
  // ==========================================================

  const handleEdit = (product) => {
    setEditingId(product.id)

    setForm({
      product_name: product.product_name,
      description: product.description || '',
      price: product.price,
      quantity: product.quantity
    })

    setMessage('')
    setError('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // ==========================================================
  // DELETE PRODUCT
  // ==========================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?'
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setMessage('')

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/products/${id}`,
        {
          method: 'DELETE'
        }
      )

      const result = await response.json()

      if (!response.ok || !result.status) {
        if (response.status === 401) {
          handleLogout()
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(
          result.message || result.error || 'Failed to delete product.'
        )
      }

      setMessage('Product deleted successfully.')

      if (editingId === id) {
        resetForm()
      }

      await loadProducts()
    } catch (err) {
      setError(err.message || 'Unable to delete product.')
    }
  }

  // ==========================================================
  // LOGIN SCREEN
  // ==========================================================

  if (!token) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>LavaLust</h1>
            <p>Student Product Management System</p>
          </div>

          <div className="api-status">
            <span className="status-dot"></span>
            LavaLust API
          </div>
        </header>

        <main className="container">
          <section className="card login-card">
            <div className="card-header">
              <h2>Login</h2>
              <p>Login to access the Product Management System.</p>
            </div>

            {loginError && (
              <div className="alert error">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="product-form">
              <div className="form-group">
                <label htmlFor="username">
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </section>
        </main>

        <footer>
          LavaLust Lab 6 — React Frontend
        </footer>
      </div>
    )
  }

  // ==========================================================
  // PRODUCT MANAGEMENT SCREEN
  // ==========================================================

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>LavaLust</h1>
          <p>Student Product Management System</p>
        </div>

        <div className="api-status">
          <span className="status-dot"></span>
          LavaLust API
        </div>
      </header>

      <main className="container">
        <section className="welcome">
          <div>
            <h2>Product Management</h2>

            <p>
              Welcome, <strong>{user?.username || 'User'}</strong>.
            </p>

            <p>
              Manage products using the React frontend and LavaLust API.
            </p>
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={handleLogout}
          >
            Logout
          </button>
        </section>

        {message && (
          <div className="alert success">
            {message}
          </div>
        )}

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <section className="card">
          <div className="card-header">
            <h2>
              {editingId !== null
                ? 'Edit Product'
                : 'Add Product'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-group">
              <label htmlFor="product_name">
                Product Name
              </label>

              <input
                id="product_name"
                name="product_name"
                type="text"
                value={form.product_name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter product description"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">
                  Price
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="quantity">
                  Quantity
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn primary"
              >
                {editingId !== null
                  ? 'Update Product'
                  : 'Add Product'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-header product-list-header">
            <div>
              <h2>Product List</h2>

              <p>
                {products.length} product
                {products.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              type="button"
              className="btn secondary"
              onClick={loadProducts}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading && products.length === 0 ? (
            <div className="empty-state">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              No products found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>

                      <td>
                        <strong>
                          {product.product_name}
                        </strong>
                      </td>

                      <td>
                        {product.description ||
                          'No description'}
                      </td>

                      <td>
                        ₱
                        {Number(
                          product.price
                        ).toLocaleString(
                          'en-PH',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}
                      </td>

                      <td>{product.quantity}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn small edit"
                            onClick={() =>
                              handleEdit(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn small delete"
                            onClick={() =>
                              handleDelete(product.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer>
        LavaLust Lab 6 — React Frontend
      </footer>
    </div>
  )
}

export default App