import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { CRStatus, RiskLevel } from "@cmp/shared";

export class CreateChangeRequestDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsEnum(RiskLevel)
  riskLevel!: RiskLevel;

  @IsString()
  @MinLength(5)
  rollbackPlan!: string;

  @IsDateString()
  plannedStart!: string;

  @IsDateString()
  plannedEnd!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  systemAssetIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendorReference?: string;
}

export class UpdateChangeRequestDto {
  @IsOptional() @IsString() @MinLength(3) title?: string;
  @IsOptional() @IsString() @MinLength(10) description?: string;
  @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @IsOptional() @IsString() @MinLength(5) rollbackPlan?: string;
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) systemAssetIds?: string[];
  @IsOptional() @IsString() @MaxLength(120) vendorReference?: string;
}

export class DecisionDto {
  @IsIn(["APPROVE", "REJECT"])
  decision!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class ListQueryDto {
  @IsOptional() @IsEnum(CRStatus) status?: CRStatus;
  @IsOptional() @IsEnum(RiskLevel) riskLevel?: RiskLevel;
  @IsOptional() @IsString() systemAssetId?: string;
  @IsOptional() @IsString() vendorOrgId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ConflictQueryDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  systemAssetIds!: string[];

  @IsDateString()
  plannedStart!: string;

  @IsDateString()
  plannedEnd!: string;

  @IsOptional()
  @IsString()
  excludeId?: string;
}
