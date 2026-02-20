package com.linkpouch.stash.infrastructure.jooq.generated.tables;

import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.jooq.impl.TableImpl;

import java.time.LocalDateTime;
import java.util.UUID;

public class Links extends TableImpl<org.jooq.Record> {
    
    public static final Links LINKS = new Links();
    
    public final Field<UUID> ID = createField(DSL.name("id"), org.jooq.impl.SQLDataType.UUID.nullable(false), this, "");
    public final Field<UUID> STASH_ID = createField(DSL.name("stash_id"), org.jooq.impl.SQLDataType.UUID.nullable(false), this, "");
    public final Field<String> URL = createField(DSL.name("url"), org.jooq.impl.SQLDataType.CLOB.nullable(false), this, "");
    public final Field<String> TITLE = createField(DSL.name("title"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<String> DESCRIPTION = createField(DSL.name("description"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<String> FAVICON_URL = createField(DSL.name("favicon_url"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<String> PAGE_CONTENT = createField(DSL.name("page_content"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<String> FINAL_URL = createField(DSL.name("final_url"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<String> SCREENSHOT_KEY = createField(DSL.name("screenshot_key"), org.jooq.impl.SQLDataType.CLOB, this, "");
    public final Field<LocalDateTime> SCREENSHOT_GENERATED_AT = createField(DSL.name("screenshot_generated_at"), org.jooq.impl.SQLDataType.LOCALDATETIME, this, "");
    public final Field<LocalDateTime> CREATED_AT = createField(DSL.name("created_at"), org.jooq.impl.SQLDataType.LOCALDATETIME.nullable(false), this, "");
    public final Field<LocalDateTime> UPDATED_AT = createField(DSL.name("updated_at"), org.jooq.impl.SQLDataType.LOCALDATETIME.nullable(false), this, "");
    
    private Links() {
        super(DSL.name("links"), null);
    }
    
    @Override
    public Links as(String alias) {
        return new Links();
    }
}
