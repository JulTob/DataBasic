import com.healthmarketscience.jackcess.*;
import java.io.File;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;

public class NativeAccess {
    static List<Element> children(Element parent, String name) {
        List<Element> elements = new ArrayList<>();
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element child && child.getTagName().equals(name)) elements.add(child);
        }
        return elements;
    }

    static boolean yes(Element element, String key) {
        return Boolean.parseBoolean(element.getAttribute(key));
    }

    static int integer(Element element, String key) {
        return Integer.parseInt(element.getAttribute(key));
    }

    static Object property(Element item) {
        String value = item.getAttribute("value");
        return switch (item.getAttribute("type")) {
            case "BYTE" -> Byte.valueOf(value);
            case "INT" -> Short.valueOf(value);
            case "BOOLEAN" -> Boolean.valueOf(value);
            default -> value;
        };
    }

    static ColumnBuilder field(Element item) {
        DataType type = DataType.valueOf(item.getAttribute("type"));
        ColumnBuilder field = new ColumnBuilder(item.getAttribute("name"), type);
        if (type == DataType.TEXT) field.setLengthInUnits(integer(item, "size")).setCompressedUnicode(true);
        if (type == DataType.NUMERIC) {
            field.setPrecision(integer(item, "precision")).setScale(integer(item, "scale"));
        }
        field.setAutoNumber(yes(item, "auto"));
        field.setHyperlink(yes(item, "hyperlink"));
        for (Element p : children(item, "property")) {
            field.putProperty(p.getAttribute("name"), DataType.valueOf(p.getAttribute("type")), property(p));
        }
        return field;
    }

    static void table(Database db, Element item) throws Exception {
        TableBuilder builder = new TableBuilder(item.getAttribute("name"));
        for (Element f : children(item, "field")) builder.addColumn(field(f));
        for (Element p : children(item, "property")) {
            builder.putProperty(p.getAttribute("name"), DataType.valueOf(p.getAttribute("type")), property(p));
        }
        for (Element k : children(item, "key")) {
            IndexBuilder index = new IndexBuilder(k.getAttribute("name"));
            for (Element c : children(k, "col")) index.addColumns(c.getAttribute("name"));
            if (yes(k, "unique")) index.setUnique();
            if (yes(k, "primary")) index.setPrimaryKey();
            builder.addIndex(index);
        }
        builder.toTable(db);
    }

    static void relation(Database db, Element item) throws Exception {
        RelationshipBuilder relation = new RelationshipBuilder(item.getAttribute("from"), item.getAttribute("to"));
        relation.setName(item.getAttribute("name"));
        for (Element pair : children(item, "pair")) {
            relation.addColumns(pair.getAttribute("parentColumn"), pair.getAttribute("childColumn"));
        }
        if (yes(item, "enforce")) {
            relation.setReferentialIntegrity();
            if (yes(item, "cascadeUpdate")) relation.setCascadeUpdates();
            if (yes(item, "cascadeDelete")) relation.setCascadeDeletes();
            if (yes(item, "nullOnDelete")) relation.setCascadeNullOnDelete();
        }
        relation.toRelationship(db);
    }

    static LocalDateTime dateTime(String value) {
        if (value.matches("\\d{2}:.*")) return LocalDate.of(1899, 12, 30).atTime(LocalTime.parse(value));
        if (value.length() == 10) return LocalDate.parse(value).atStartOfDay();
        return LocalDateTime.parse(value.replace(' ', 'T'));
    }

    static Object cellValue(Column column, String value) {
        if (column.getType() == DataType.TEXT || column.getType() == DataType.MEMO) return value;
        value = value.strip();
        return switch (column.getType()) {
            case BYTE -> {
                int number = Integer.parseInt(value);
                if (number < 0 || number > 255) throw new IllegalArgumentException("Byte fuera de 0–255.");
                yield (byte)number;
            }
            case INT -> Short.valueOf(value);
            case LONG -> Integer.valueOf(value);
            case DOUBLE -> Double.valueOf(value);
            case FLOAT -> Float.valueOf(value);
            case MONEY, NUMERIC -> new BigDecimal(value);
            case SHORT_DATE_TIME -> dateTime(value);
            case BOOLEAN -> switch (value.strip().toLowerCase(Locale.ROOT)) {
                case "true", "sí", "si", "1", "verdadero" -> true;
                case "false", "no", "0", "falso" -> false;
                default -> throw new IllegalArgumentException("Use sí o no en el campo booleano.");
            };
            default -> throw new IllegalArgumentException("No se admite introducir datos de tipo " + column.getType());
        };
    }

    static void records(Database db, Element schema) throws Exception {
        db.setEvaluateExpressions(true);
        db.setEnforceForeignKeys(true);
        db.setAllowAutoNumberInsert(true);
        Map<String,Integer> counts = new HashMap<>();
        for (Element row : children(schema, "row")) {
            Table table = db.getTable(row.getAttribute("table"));
            int count = counts.merge(table.getName(), 1, Integer::sum);
            try {
                Map<String,Object> values = new LinkedHashMap<>();
                for (Element cell : children(row, "cell")) {
                    Column column = table.getColumn(cell.getAttribute("name"));
                    values.put(column.getName(), cellValue(column, cell.getAttribute("value")));
                }
                table.addRowFromMap(values);
            } catch (Exception error) {
                throw new IllegalArgumentException(table.getName() + ", fila " + count + ": " + error.getMessage(), error);
            }
        }
    }

    static void write(String schemaFile, String target) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        Element schema = factory.newDocumentBuilder().parse(new File(schemaFile)).getDocumentElement();
        File file = new File(target);
        try (Database db = DatabaseBuilder.create(Database.FileFormat.V2010, file)) {
            for (Element t : children(schema, "table")) table(db, t);
            // Adding enforced relationships after loading checks all existing rows, including forward references.
            records(db, schema);
            for (Element r : children(schema, "relation")) relation(db, r);
            for (Element query : children(schema, "query")) SavedSelect.create(db, query);
        }
        try (Database db = DatabaseBuilder.open(file)) {
            for (Element item : children(schema, "query")) {
                String name = item.getAttribute("name");
                var query = db.getQueries().stream().filter(q -> name.equals(q.getName())).findFirst().orElseThrow();
                if (!query.toSQLString().startsWith("SELECT ")) throw new IllegalStateException(name);
            }
            if (db.getTableNames().size() != children(schema, "table").size()
                || db.getRelationships().size() != children(schema, "relation").size()) {
                throw new IllegalStateException("El archivo reabierto contiene un inventario inesperado.");
            }
        }
    }

    public static void main(String... args) {
        try {
            write(args[0], args[1]);
        } catch (Exception error) {
            System.err.println(error.getMessage());
            System.exit(1);
        }
    }
}
