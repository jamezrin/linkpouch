package com.linkpouch.stash.infrastructure.adapter.web.config;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.BeanProperty;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.deser.std.StdDeserializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.StdSerializer;
import tools.jackson.databind.type.TypeFactory;

/**
 * Registers a Jackson 3 compatible module for JsonNullable.
 *
 * <p>jackson-databind-nullable 0.2.x uses com.fasterxml.jackson APIs and cannot register its
 * JsonNullableModule with Jackson 3's ObjectMapper. This bean bridges the gap.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public SimpleModule jsonNullableModule() {
        final SimpleModule module = new SimpleModule("JsonNullableJackson3Module");
        module.addSerializer(JsonNullable.class, new JsonNullableSerializer());
        module.addDeserializer(JsonNullable.class, new JsonNullableDeserializer(null));
        return module;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static final class JsonNullableSerializer extends StdSerializer<JsonNullable> {

        JsonNullableSerializer() {
            super(JsonNullable.class);
        }

        @Override
        public void serialize(final JsonNullable value, final JsonGenerator gen, final SerializationContext provider)
                throws JacksonException {
            if (value.isPresent()) {
                provider.writeValue(gen, value.get());
            } else {
                gen.writeNull();
            }
        }

        @Override
        public boolean isEmpty(final SerializationContext provider, final JsonNullable value) {
            return !value.isPresent();
        }
    }

    private static final class JsonNullableDeserializer extends StdDeserializer<JsonNullable<?>> {

        private final JavaType containedType;

        JsonNullableDeserializer(final JavaType wrappingType) {
            super(JsonNullable.class);
            this.containedType = wrappingType != null ? wrappingType.containedType(0) : null;
        }

        @Override
        public JsonNullable<?> deserialize(final JsonParser p, final DeserializationContext ctxt)
                throws JacksonException {
            final JavaType typeToUse = containedType != null ? containedType : TypeFactory.unknownType();
            final Object value = ctxt.readValue(p, typeToUse);
            return JsonNullable.of(value);
        }

        @Override
        public JsonNullable<?> getNullValue(final DeserializationContext ctxt) {
            return JsonNullable.of(null);
        }

        @Override
        public StdDeserializer<?> createContextual(final DeserializationContext ctxt, final BeanProperty property) {
            return new JsonNullableDeserializer(property != null ? property.getType() : ctxt.getContextualType());
        }
    }
}
