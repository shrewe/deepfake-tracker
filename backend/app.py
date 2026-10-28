
import hashlib
import os
import re
from datetime import date

import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "deepfake_tracker"),
    )


def close_db(connection, cursor):
    if cursor is not None:
        cursor.close()
    if connection is not None and connection.is_connected():
        connection.close()


def next_prefixed_id(cursor, table, column, prefix):
    """Generate IDs such as C-007 or N-006 for the existing demo schema."""
    allowed = {
        ("Viral_Claims", "Claim_ID", "C"),
        ("Source_Nodes", "Node_ID", "N"),
        ("Amplification_Metrics", "Metric_ID", "M"),
    }

    if (table, column, prefix) not in allowed:
        raise ValueError("Unsupported ID configuration")

    cursor.execute(
        f"SELECT {column} FROM {table} WHERE {column} LIKE %s",
        (f"{prefix}-%",),
    )

    largest = 0
    for row in cursor.fetchall():
        value = row[0]
        match = re.fullmatch(rf"{prefix}-(\d+)", str(value))
        if match:
            largest = max(largest, int(match.group(1)))

    return f"{prefix}-{largest + 1:03d}"


def serializable_rows(rows, date_fields=()):
    """Convert database date/time values into JSON-friendly strings."""
    for row in rows:
        for field in date_fields:
            if row.get(field) is not None:
                row[field] = row[field].isoformat()
    return rows


@app.route("/api/health", methods=["GET"])
def health():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE(), VERSION()")
        database, version = cursor.fetchone()

        return jsonify({
            "status": "ok",
            "database": database,
            "mysql_version": version,
        })

    except mysql.connector.Error:
        app.logger.exception("Database connection failed")
        return jsonify({
            "status": "error",
            "message": "Could not connect to the database. Check backend configuration.",
        }), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(DISTINCT vc.Claim_ID) AS total_claims,
                COUNT(DISTINCT fcr.Claim_ID) AS claims_with_reports,
                COUNT(DISTINCT CASE
                    WHEN fcr.Verdict = 'False'
                    THEN vc.Claim_ID
                END) AS claims_marked_false
            FROM Viral_Claims vc
            LEFT JOIN Fact_Checker_Reports fcr
                ON vc.Claim_ID = fcr.Claim_ID
        """)

        return jsonify(cursor.fetchone())

    except mysql.connector.Error:
        app.logger.exception("Dashboard statistics query failed")
        return jsonify({"error": "Unable to retrieve dashboard statistics"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/claims", methods=["GET"])
def get_claims():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                vc.Claim_ID AS claim_id,
                vc.Content_Text AS content_text,
                vc.Media_Type AS media_type,
                vc.First_Seen_Date AS first_seen_date,
                sn.Username AS username,
                sn.Is_Verified AS is_verified,
                sn.Bot_Probability_Score AS bot_probability_score,
                fcr.Verdict AS verdict,
                fcr.Checking_Agency AS checking_agency,
                fcr.Date_Published AS date_published
            FROM Viral_Claims vc
            JOIN Source_Nodes sn
                ON vc.Node_ID = sn.Node_ID
            LEFT JOIN Fact_Checker_Reports fcr
                ON vc.Claim_ID = fcr.Claim_ID
            ORDER BY vc.Claim_ID
        """)

        rows = cursor.fetchall()
        serializable_rows(rows, ("first_seen_date", "date_published"))
        return jsonify(rows)

    except mysql.connector.Error:
        app.logger.exception("Claims query failed")
        return jsonify({"error": "Unable to retrieve claims"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/claims/<claim_id>", methods=["GET"])
def get_claim_details(claim_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                vc.Claim_ID AS claim_id,
                vc.Node_ID AS node_id,
                vc.Content_Text AS content_text,
                vc.Media_Type AS media_type,
                vc.First_Seen_Date AS first_seen_date,
                sn.Username AS username,
                sn.Account_Creation_Date AS account_creation_date,
                sn.Is_Verified AS is_verified,
                sn.Bot_Probability_Score AS bot_probability_score,
                sn.Follower_Count AS follower_count
            FROM Viral_Claims vc
            JOIN Source_Nodes sn ON vc.Node_ID = sn.Node_ID
            WHERE vc.Claim_ID = %s
        """, (claim_id,))

        claim = cursor.fetchone()

        if claim is None:
            return jsonify({"error": "Claim not found"}), 404

        claim["first_seen_date"] = (
            claim["first_seen_date"].isoformat()
            if claim["first_seen_date"] else None
        )
        claim["account_creation_date"] = (
            claim["account_creation_date"].isoformat()
            if claim["account_creation_date"] else None
        )

        cursor.execute("""
            SELECT
                Report_ID AS report_id,
                Claim_ID AS claim_id,
                Checking_Agency AS checking_agency,
                Verdict AS verdict,
                Date_Published AS date_published,
                Evidence_URL AS evidence_url
            FROM Fact_Checker_Reports
            WHERE Claim_ID = %s
            ORDER BY Date_Published DESC
        """, (claim_id,))

        reports = cursor.fetchall()
        serializable_rows(reports, ("date_published",))

        cursor.execute("""
            SELECT
                am.Metric_ID AS metric_id,
                am.Claim_ID AS claim_id,
                am.Platform_ID AS platform_id,
                sp.Platform_Name AS platform_name,
                am.Timestamp AS timestamp,
                am.Shares_Count AS shares_count,
                am.Views_Count AS views_count
            FROM Amplification_Metrics am
            JOIN Social_Platforms sp
                ON am.Platform_ID = sp.Platform_ID
            WHERE am.Claim_ID = %s
            ORDER BY am.Timestamp
        """, (claim_id,))

        metrics = cursor.fetchall()
        serializable_rows(metrics, ("timestamp",))

        cursor.execute("""
            SELECT
                Index_ID AS index_id,
                Claim_ID AS claim_id,
                Region AS region,
                Sentiment_Score AS sentiment_score,
                Search_Volume_Spike AS search_volume_spike,
                Date_Recorded AS date_recorded
            FROM Public_Panic_Index
            WHERE Claim_ID = %s
            ORDER BY Date_Recorded DESC
        """, (claim_id,))

        panic = cursor.fetchall()
        serializable_rows(panic, ("date_recorded",))

        claim["reports"] = reports
        claim["metrics"] = metrics
        claim["panic"] = panic
        claim["verdict"] = reports[0]["verdict"] if reports else "Unverified"

        return jsonify(claim)

    except mysql.connector.Error:
        app.logger.exception("Claim details query failed")
        return jsonify({"error": "Unable to retrieve claim details"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/claims", methods=["POST"])
def create_claim():
    connection = None
    cursor = None

    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username") or "").strip()
    claim_text = str(payload.get("claim_text") or "").strip()
    media_type = str(payload.get("media_type") or "").strip()
    platform_id = payload.get("platform_id")
    evidence_url = str(payload.get("evidence_url") or "").strip()

    if not username or not claim_text or not media_type or platform_id is None:
        return jsonify({
            "error": "username, claim_text, media_type and platform_id are required"
        }), 400

    if len(claim_text) > 10000 or len(username) > 255:
        return jsonify({"error": "Input exceeds the allowed length"}), 400

    username = username if username.startswith("@") else f"@{username}"

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT Platform_ID FROM Social_Platforms WHERE Platform_ID = %s",
            (platform_id,),
        )
        platform = cursor.fetchone()

        if platform is None:
            connection.rollback()
            return jsonify({"error": "Unknown platform_id"}), 400

        cursor.execute("""
            SELECT Node_ID
            FROM Source_Nodes
            WHERE LOWER(Username) = LOWER(%s)
            LIMIT 1
        """, (username,))
        source = cursor.fetchone()

        if source:
            node_id = source["Node_ID"]
        else:
            node_id = next_prefixed_id(cursor, "Source_Nodes", "Node_ID", "N")
            cursor.execute("""
                INSERT INTO Source_Nodes
                    (Node_ID, Username, Account_Creation_Date,
                     Is_Verified, Bot_Probability_Score, Follower_Count)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (node_id, username, date.today(), False, 0, 0))

        claim_id = next_prefixed_id(cursor, "Viral_Claims", "Claim_ID", "C")
        content_hash = hashlib.sha256(claim_text.encode("utf-8")).hexdigest()

        cursor.execute("""
            INSERT INTO Viral_Claims
                (Claim_ID, Node_ID, Content_Text, Content_Hash,
                 Media_Type, First_Seen_Date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            claim_id, node_id, claim_text, content_hash,
            media_type, date.today(),
        ))

        cursor.execute("""
            INSERT INTO Amplification_Metrics
                (Metric_ID, Claim_ID, Platform_ID, Timestamp,
                 Shares_Count, Views_Count)
            VALUES (%s, %s, %s, NOW(), %s, %s)
        """, (
            next_prefixed_id(cursor, "Amplification_Metrics", "Metric_ID", "M"),
            claim_id, platform_id, 0, 0,
        ))

        connection.commit()

        return jsonify({
            "claim_id": claim_id,
            "node_id": node_id,
            "claim_text": claim_text,
            "content_text": claim_text,
            "username": username,
            "media_type": media_type,
            "first_seen_date": date.today().isoformat(),
            "platform_id": platform_id,
            "evidence_url": evidence_url,
            "verdict": "Unverified",
            "total_shares": 0,
        }), 201

    except mysql.connector.IntegrityError:
        if connection is not None and connection.is_connected():
            connection.rollback()
        app.logger.exception("Claim insert violated a database constraint")
        return jsonify({
            "error": "The claim could not be saved. Its content may already exist."
        }), 409

    except (mysql.connector.Error, ValueError):
        if connection is not None and connection.is_connected():
            connection.rollback()
        app.logger.exception("Creating claim failed")
        return jsonify({"error": "Unable to create claim"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/platforms/amplification", methods=["GET"])
def platform_amplification():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sp.Platform_ID AS platform_id,
                sp.Platform_Name AS platform_name,
                SUM(am.Shares_Count) AS total_shares,
                SUM(am.Views_Count) AS total_views
            FROM Social_Platforms sp
            JOIN Amplification_Metrics am
                ON sp.Platform_ID = am.Platform_ID
            GROUP BY sp.Platform_ID, sp.Platform_Name
            ORDER BY total_shares DESC
        """)

        return jsonify(cursor.fetchall())

    except mysql.connector.Error:
        app.logger.exception("Platform amplification query failed")
        return jsonify({"error": "Unable to retrieve platform amplification"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/analytics/trends", methods=["GET"])
def analytics_trends():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                DATE(am.Timestamp) AS trend_date,
                sp.Platform_ID AS platform_id,
                sp.Platform_Name AS platform_name,
                SUM(am.Shares_Count) AS total_shares,
                SUM(am.Views_Count) AS total_views
            FROM Amplification_Metrics am
            JOIN Social_Platforms sp
                ON am.Platform_ID = sp.Platform_ID
            GROUP BY
                DATE(am.Timestamp),
                sp.Platform_ID,
                sp.Platform_Name
            ORDER BY trend_date ASC, sp.Platform_ID ASC
        """)

        rows = cursor.fetchall()
        serializable_rows(rows, ("trend_date",))
        return jsonify(rows)

    except mysql.connector.Error:
        app.logger.exception("Analytics trends query failed")
        return jsonify({"error": "Unable to retrieve analytics trends"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/reports", methods=["GET"])
def get_reports():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                fcr.Report_ID AS report_id,
                fcr.Claim_ID AS claim_id,
                vc.Content_Text AS claim_text,
                fcr.Checking_Agency AS checking_agency,
                fcr.Verdict AS verdict,
                fcr.Date_Published AS date_published,
                fcr.Evidence_URL AS evidence_url
            FROM Fact_Checker_Reports fcr
            JOIN Viral_Claims vc ON vc.Claim_ID = fcr.Claim_ID
            ORDER BY fcr.Date_Published DESC
        """)

        rows = cursor.fetchall()
        serializable_rows(rows, ("date_published",))
        return jsonify(rows)

    except mysql.connector.Error:
        app.logger.exception("Reports query failed")
        return jsonify({"error": "Unable to retrieve reports"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/source-nodes", methods=["GET"])
def get_source_nodes():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sn.Node_ID AS node_id,
                sn.Username AS username,
                sn.Account_Creation_Date AS account_creation_date,
                sn.Is_Verified AS is_verified,
                sn.Bot_Probability_Score AS bot_probability_score,
                sn.Follower_Count AS follower_count,
                COUNT(vc.Claim_ID) AS claim_count
            FROM Source_Nodes sn
            LEFT JOIN Viral_Claims vc ON vc.Node_ID = sn.Node_ID
            GROUP BY
                sn.Node_ID, sn.Username, sn.Account_Creation_Date,
                sn.Is_Verified, sn.Bot_Probability_Score, sn.Follower_Count
            ORDER BY claim_count DESC, sn.Username
        """)

        rows = cursor.fetchall()
        serializable_rows(rows, ("account_creation_date",))
        return jsonify(rows)

    except mysql.connector.Error:
        app.logger.exception("Source nodes query failed")
        return jsonify({"error": "Unable to retrieve source nodes"}), 500

    finally:
        close_db(connection, cursor)


@app.route("/api/public-panic-index", methods=["GET"])
def get_public_panic_index():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                ppi.Index_ID AS index_id,
                ppi.Claim_ID AS claim_id,
                vc.Content_Text AS claim_text,
                ppi.Region AS region,
                ppi.Sentiment_Score AS sentiment_score,
                ppi.Search_Volume_Spike AS search_volume_spike,
                ppi.Date_Recorded AS date_recorded,
                (
                    SELECT fcr.Verdict
                    FROM Fact_Checker_Reports fcr
                    WHERE fcr.Claim_ID = ppi.Claim_ID
                    ORDER BY fcr.Date_Published DESC
                    LIMIT 1
                ) AS verdict
            FROM Public_Panic_Index ppi
            JOIN Viral_Claims vc ON vc.Claim_ID = ppi.Claim_ID
            ORDER BY ppi.Date_Recorded DESC
        """)

        rows = cursor.fetchall()
        serializable_rows(rows, ("date_recorded",))
        return jsonify(rows)

    except mysql.connector.Error:
        app.logger.exception("Public panic index query failed")
        return jsonify({"error": "Unable to retrieve public panic index"}), 500

    finally:
        close_db(connection, cursor)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
