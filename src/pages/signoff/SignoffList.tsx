import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectDB } from '@/data/projects';
import { signoffDB } from '@/data/signoff';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SIGNOFF_LIST_COLUMNS } from '@/types/bd';
import { Edit, FileCheck, Plus } from 'lucide-react';

const SignoffList: React.FC = () => {
  const navigate = useNavigate();

  const signedProjects = useMemo(() => {
    return projectDB.getSignedProjects();
  }, []);

  const signoffs = useMemo(() => {
    return signoffDB.getAll();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSignoffForProject = (projectId: string) => {
    return signoffs.find(s => s.projectId === projectId);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">立项管理</h1>
        <p className="mt-1 text-muted-foreground">管理已签单项目的立项信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            签单项目立项状态
          </CardTitle>
          <CardDescription>只有项目类别为"签单"的项目才需要录入立项信息</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {SIGNOFF_LIST_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {signedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileCheck className="h-8 w-8" />
                        <p>暂无签单项目</p>
                        <p className="text-sm">请先在项目库中创建类别为"签单"的项目</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  signedProjects.map(project => {
                    const signoff = getSignoffForProject(project.id);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {project.projectName}
                        </TableCell>
                        <TableCell>{project.shortName}</TableCell>
                        <TableCell>
                          {signoff ? (
                            <Badge variant="default">已立项</Badge>
                          ) : (
                            <Badge variant="outline">待立项</Badge>
                          )}
                        </TableCell>
                        <TableCell>{signoff?.contractEntity || '-'}</TableCell>
                        <TableCell>
                          {signoff ? formatAmount(signoff.revenueWithTax) : '-'}
                        </TableCell>
                        <TableCell>
                          {signoff ? formatAmount(signoff.receivedAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/signoff/${project.id}`)}
                          >
                            {signoff ? (
                              <Edit className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground">
        共 {signedProjects.length} 个签单项目，其中 {signoffs.length} 个已立项
      </div>
    </div>
  );
};

export default SignoffList;
