# audit_report.py
from pprint import pformat

def generate_txt_report(errors, cleaned_data=None, timestamp=None,
                        input_file=None, error_rows=None,
                        output_file="audit_report.txt"):
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("AUDIT REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Input File: {input_file}\n")
        f.write(f"Number of Error Rows: {error_rows}\n\n")

        if not errors:
            f.write("STATUS: PASS\n\n")
            f.write("No validation errors found.\n\n")
            if cleaned_data:
                f.write(f"Cleaned Records (Total: {len(cleaned_data)}):\n")
                f.write("-"*60 + "\n\n")
                for idx, record in enumerate(cleaned_data, start=1):
                    f.write(f"Record #{idx}:\n")
                    f.write(pformat(record, width=80))
                    f.write("\n" + "-"*60 + "\n\n")
            else:
                f.write("(No cleaned records to display)\n\n")
        else:
            f.write("STATUS: FAIL\n\n")
            f.write("Validation Errors:\n")
            f.write("-"*60 + "\n\n")
            for err in errors:
                f.write(f"- {err}\n")
            f.write("\n")
