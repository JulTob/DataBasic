import com.healthmarketscience.jackcess.*;
import java.nio.ByteBuffer;
import java.time.LocalDateTime;
import java.util.*;
import org.w3c.dom.Element;

/** Stores the ACE SelectQuery catalogue rows used by Jackcess QueryFormat. */
final class SavedSelect {
    private SavedSelect() {}

    static void create(Database db, Element query) throws Exception {
        Table objects = db.getSystemTable("MSysObjects");
        Table access = db.getSystemTable("MSysACEs");
        Table definition = db.getSystemTable("MSysQueries");
        Set<Integer> taken = new HashSet<>();
        Row template = null;
        for (Row entry : objects) {
            taken.add(entry.getInt("Id"));
            if (entry.getShort("Type") == 1 && db.getTableNames().contains(entry.getString("Name"))) {
                template = entry;
            }
        }
        if (template == null) throw new IllegalArgumentException("La consulta necesita una tabla local.");

        int id = Integer.MIN_VALUE + 1;
        while (taken.contains(id)) id++;
        LocalDateTime now = LocalDateTime.now();
        objects.addRowFromMap(new HashMap<>(Map.of(
            "Id", id, "ParentId", template.getInt("ParentId"),
            "Name", query.getAttribute("name"), "Type", (short)5,
            "Owner", template.getBytes("Owner"), "Flags", 0,
            "DateCreate", now, "DateUpdate", now
        )));

        // Use the ACL of a freshly created table in this same database.
        List<Map<String,Object>> permissions = new ArrayList<>();
        for (Row permission : access) {
            if (Objects.equals(permission.getInt("ObjectId"), template.getInt("Id"))) {
                Map<String,Object> copy = new HashMap<>(permission);
                copy.put("ObjectId", id);
                permissions.add(copy);
            }
        }
        for (Map<String,Object> permission : permissions) access.addRowFromMap(permission);

        Map<Integer,Integer> order = new HashMap<>();
        for (Element part : NativeAccess.children(query, "part")) {
            int attribute = NativeAccess.integer(part, "attribute");
            int position = order.merge(attribute, 1, Integer::sum);
            Map<String,Object> row = new HashMap<>();
            row.put("ObjectId", id);
            row.put("Attribute", (byte)attribute);
            row.put("Order", ByteBuffer.allocate(4).putInt(position).array());
            if (part.hasAttribute("expr")) row.put("Expression", part.getAttribute("expr"));
            if (part.hasAttribute("name1")) row.put("Name1", part.getAttribute("name1"));
            if (part.hasAttribute("name2")) row.put("Name2", part.getAttribute("name2"));
            if (part.hasAttribute("flag")) row.put("Flag", (short)NativeAccess.integer(part, "flag"));
            definition.addRowFromMap(row);
        }
    }
}
