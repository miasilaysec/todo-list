# To-Do List — Full Stack (Yavuzlar Hafta 3)

HTML/CSS/JavaScript frontend, Go REST API backend, PostgreSQL ve Docker ile çalışan yapılacaklar uygulaması.

> **Not:** Hafta 1'deki basit sürüm (localStorage) `frontend/` klasöründeki güncel arayüz ve API entegrasyonu ile değiştirilmiştir.

## Özellikler (Görev İsterleri)

- **Go backend** — `net/http` ile REST API, base path `/api/v1`
- **CRUD** — Görev listeleme, oluşturma, güncelleme, silme
- **Todo modeli** — `id` (UUID), `title`, `completed`, `created_at`
- **GORM** — PostgreSQL ORM
- **JWT** — Kayıt/giriş sonrası token; CRUD için zorunlu kimlik doğrulama
- **PostgreSQL** — Kalıcı veri, Docker volume ile container yeniden başlatıldığında veri korunur
- **Frontend** — `localStorage` kaldırıldı; tüm işlemler API üzerinden
- **Docker** — `docker-compose up --build` ile frontend, backend ve veritabanı

## Proje Yapısı

```
├── frontend/           # HTML, CSS, JS
├── backend/            # Go API
├── dev.frontend.Dockerfile
├── dev.backend.Dockerfile
└── docker-compose.yaml
```

## Çalıştırma

Proje kök dizininde:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080/api/v1
- **PostgreSQL:** localhost:5432

## API (Postman)

Base URL: `http://localhost:8080/api/v1`

### Kimlik doğrulama (JWT gerekmez)

| Metot | Endpoint | Body |
|-------|----------|------|
| POST | `/auth/register` | `{"username":"ali","password":"123456"}` |
| POST | `/auth/login` | `{"username":"ali","password":"123456"}` |

Yanıt: `{"token":"<jwt>"}`

### Görevler (Header: `Authorization: Bearer <token>`)

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | `/todos` | Listele |
| POST | `/todos` | Oluştur — `{"title":"...","completed":false}` |
| GET | `/todos/{uuid}` | Tek görev |
| PUT | `/todos/{uuid}` | Güncelle — `{"title":"...","completed":true}` |
| DELETE | `/todos/{uuid}` | Sil |

## Geliştirme Notları

- JWT token tarayıcıda yalnızca `sessionStorage` içinde tutulur (görev verisi değil).
- Nginx, frontend container içinde `/api` isteklerini backend'e yönlendirir.
