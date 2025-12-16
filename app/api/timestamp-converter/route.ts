import { NextRequest, NextResponse } from "next/server";

// LDAP/Active Directory epoch: January 1, 1601 00:00:00 UTC
const LDAP_EPOCH = new Date("1601-01-01T00:00:00Z").getTime();
// Win32 epoch: January 1, 1601 00:00:00 UTC
const WIN32_EPOCH = new Date("1601-01-01T00:00:00Z").getTime();
// Note: JavaScript's Date constructor uses Unix epoch (January 1, 1970) by default

interface ConvertRequest {
  timestamp: string | number;
  format: "LDAP" | "EPOCH_TIME_JAVA" | "EPOCH_TIME_WIN32" | "CUSTOM";
  customFormat?: string; // Optional format string for CUSTOM type
}

interface ConvertResponse {
  success: boolean;
  iso8601?: string;
  error?: string;
  input?: {
    timestamp: string | number;
    format: string;
  };
}

/**
 * Converts LDAP/Active Directory timestamp to Date
 * LDAP timestamps are 100-nanosecond intervals since January 1, 1601
 */
function convertLDAP(timestamp: number): Date {
  // LDAP timestamp is in 100-nanosecond intervals
  // Convert to milliseconds: divide by 10,000
  const milliseconds = timestamp / 10000;
  return new Date(LDAP_EPOCH + milliseconds);
}

/**
 * Converts Java epoch timestamp to Date
 * Java epoch is milliseconds since January 1, 1970 (Unix epoch)
 * JavaScript's Date constructor natively handles Unix epoch timestamps
 */
function convertJavaEpoch(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Converts Win32 epoch timestamp to Date
 * Win32 epoch can be seconds since January 1, 1601 or seconds since 1970
 * We'll try both and use the one that makes more sense
 */
function convertWin32Epoch(timestamp: number): Date {
  // Win32 FILETIME is typically in 100-nanosecond intervals since 1601
  // But sometimes it's in seconds since 1601 or 1970
  // Try as 100-nanosecond intervals first (most common)
  if (timestamp > 100000000000000000) {
    // Likely 100-nanosecond intervals since 1601
    const milliseconds = timestamp / 10000;
    return new Date(WIN32_EPOCH + milliseconds);
  } else if (timestamp > 10000000000) {
    // Likely milliseconds since 1970
    return new Date(timestamp);
  } else {
    // Likely seconds since 1970
    return new Date(timestamp * 1000);
  }
}

/**
 * Converts custom date format to Date
 * Tries multiple parsing strategies
 */
function convertCustom(timestamp: string, customFormat?: string): Date {
  // Try direct Date parsing first
  const directParse = new Date(timestamp);
  if (!isNaN(directParse.getTime())) {
    return directParse;
  }

  // Try parsing as number (in case it's a string representation of a number)
  const numParse = Number(timestamp);
  if (!isNaN(numParse)) {
    // Try as milliseconds since 1970
    const date = new Date(numParse);
    if (!isNaN(date.getTime())) {
      return date;
    }
    // Try as seconds since 1970
    const dateSeconds = new Date(numParse * 1000);
    if (!isNaN(dateSeconds.getTime())) {
      return dateSeconds;
    }
  }

  // If custom format is provided, we could use a library like date-fns
  // For now, throw error if direct parsing fails
  throw new Error(`Unable to parse custom date format: ${timestamp}`);
}

/**
 * Converts a Date object to ISO8601 format
 */
function toISO8601(date: Date): string {
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body: ConvertRequest = await request.json();

    // Validate request
    if (!body.timestamp && body.timestamp !== 0) {
      return NextResponse.json<ConvertResponse>(
        {
          success: false,
          error: "Timestamp is required",
        },
        { status: 400 }
      );
    }

    if (!body.format) {
      return NextResponse.json<ConvertResponse>(
        {
          success: false,
          error:
            "Format is required. Must be one of: LDAP, EPOCH_TIME_JAVA, EPOCH_TIME_WIN32, CUSTOM",
        },
        { status: 400 }
      );
    }

    let date: Date;

    try {
      switch (body.format) {
        case "LDAP": {
          const timestamp =
            typeof body.timestamp === "string"
              ? parseFloat(body.timestamp)
              : body.timestamp;
          if (isNaN(timestamp)) {
            throw new Error("LDAP timestamp must be a valid number");
          }
          date = convertLDAP(timestamp);
          break;
        }

        case "EPOCH_TIME_JAVA": {
          const timestamp =
            typeof body.timestamp === "string"
              ? parseFloat(body.timestamp)
              : body.timestamp;
          if (isNaN(timestamp)) {
            throw new Error("Java epoch timestamp must be a valid number");
          }
          date = convertJavaEpoch(timestamp);
          break;
        }

        case "EPOCH_TIME_WIN32": {
          const timestamp =
            typeof body.timestamp === "string"
              ? parseFloat(body.timestamp)
              : body.timestamp;
          if (isNaN(timestamp)) {
            throw new Error("Win32 epoch timestamp must be a valid number");
          }
          date = convertWin32Epoch(timestamp);
          break;
        }

        case "CUSTOM": {
          const timestamp = String(body.timestamp);
          date = convertCustom(timestamp, body.customFormat);
          break;
        }

        default:
          return NextResponse.json<ConvertResponse>(
            {
              success: false,
              error: `Unsupported format: ${body.format}. Must be one of: LDAP, EPOCH_TIME_JAVA, EPOCH_TIME_WIN32, CUSTOM`,
            },
            { status: 400 }
          );
      }

      // Validate the resulting date
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date result from conversion");
      }

      const iso8601 = toISO8601(date);

      return NextResponse.json<ConvertResponse>(
        {
          success: true,
          iso8601,
          input: {
            timestamp: body.timestamp,
            format: body.format,
          },
        },
        { status: 200 }
      );
    } catch (conversionError) {
      return NextResponse.json<ConvertResponse>(
        {
          success: false,
          error:
            conversionError instanceof Error
              ? conversionError.message
              : "Conversion failed",
          input: {
            timestamp: body.timestamp,
            format: body.format,
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json<ConvertResponse>(
      {
        success: false,
        error:
          error instanceof Error
            ? `Invalid request: ${error.message}`
            : "Invalid request body",
      },
      { status: 400 }
    );
  }
}
