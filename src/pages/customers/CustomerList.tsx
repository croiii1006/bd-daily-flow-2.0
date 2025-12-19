import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { feishuApi } from "@/api/feishuApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CUSTOMER_LIST_COLUMNS } from "@/types/bd";

const CustomerList: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从后端（再到飞书）拉取客户数据
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await feishuApi.getAllCustomers();
        console.log("前端收到客户数据：", data);
        setCustomers(data || []);
      } catch (e: any) {
        console.error("加载客户失败：", e);
        setError(e?.message || "加载客户数据失败");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 简单搜索过滤
  const filteredCustomers = useMemo(() => {
    if (!keyword.trim()) return customers;
    const k = keyword.trim().toLowerCase();
    return customers.filter((c: any) => {
      return (
        (c.customerId || "").toLowerCase().includes(k) ||
        (c.shortName || "").toLowerCase().includes(k) ||
        (c.brandName || "").toLowerCase().includes(k) ||
        (c.companyName || "").toLowerCase().includes(k)
      );
    });
  }, [customers, keyword]);

  const handleRowClick = (id: string) => {
    // 这里看你详情页是按什么路由设计的：
    // 如果是 /customers/:id，可以这样跳：
    navigate(`/customers/${id}`);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>客户列表（来自飞书多维表）</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="搜索客户ID / 简称 / 品牌"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64"
            />
            <Button asChild>
              <Link to="/customers/add">新建客户</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="py-6 text-sm text-muted-foreground">
              正在从飞书加载客户数据…
            </div>
          )}

          {error && (
            <div className="py-6 text-sm text-red-500">加载失败：{error}</div>
          )}

          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  {CUSTOMER_LIST_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      暂无客户数据
                    </TableCell>
                  </TableRow>
                )}

                {filteredCustomers.map((c: any) => (
                  <TableRow
                    key={c.id ?? c.recordId ?? c.customerId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      handleRowClick(c.id ?? c.recordId ?? c.customerId)
                    }
                  >
                    <TableCell>{c.customerId}</TableCell>
                    <TableCell>{c.shortName}</TableCell>
                    <TableCell>{c.brandName}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>
                      {c.level && (
                        <Badge variant="outline" className="text-xs">
                          {c.level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.industry}</TableCell>
                    <TableCell>
                      {Array.isArray(c.bdOwner)
                        ? c.bdOwner.map((b: any) => b.name).join("、")
                        : c.bdOwner?.name ?? c.bdOwner ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerList;
