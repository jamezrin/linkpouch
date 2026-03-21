# Dev Procedures

## Reset local environment to clean state

Destroys all local data (Postgres, Redis, SeaweedFS) and brings the stack back up from scratch. Atlas migrations are re-applied automatically on startup.

```sh
docker-compose down -v
docker-compose up -d stash-service indexer-service api-gateway
```

`-v` removes the named volumes (`postgres_data`, `redis_data`, `seaweedfs_data`). The stash-service container has a 60 s start-up grace period, so the dependent services (indexer, api-gateway) will wait for it to pass its health check before starting.
