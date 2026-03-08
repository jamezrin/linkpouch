variable "db_url" {
  type    = string
  default = "postgres://linkpouch:linkpouch_secret@localhost:5432/linkpouch?search_path=public&sslmode=disable"
}

env "local" {
  url = var.db_url
  dev = "docker://postgres/18/dev?search_path=public"
  migration {
    dir = "file://services/stash-service/infrastructure-persistence/src/main/resources/db/migrations"
  }
}

env "ci" {
  url = var.db_url
  dev = "docker://postgres/18/dev?search_path=public"
  migration {
    dir = "file://services/stash-service/infrastructure-persistence/src/main/resources/db/migrations"
  }
}
