import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectDB } from '@/data/projects';
import { signoffDB } from '@/data/signoff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, FileCheck } from 'lucide-react';
import { COMPLETION_STATUS, CONTRACT_ENTITIES } from '@/data/options';
import type { Project, Signoff } from '@/types';

const SignoffForm: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const [project, setProject] = useState<Project | null>(null);
  const [existingSignoff, setExistingSignoff] = useState<Signoff | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCompleted, setIsCompleted] = useState('');
  const [contractEntity, setContractEntity] = useState('');
  const [revenueWithTax, setRevenueWithTax] = useState('');
  const [revenueWithoutTax, setRevenueWithoutTax] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [finalPaymentDate, setFinalPaymentDate] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  useEffect(() => {
    if (projectId) {
      const foundProject = projectDB.getById(projectId);
      if (foundProject) {
        setProject(foundProject);
        
        // 检查是否已有立项记录
        const foundSignoff = signoffDB.getByProjectId(projectId);
        if (foundSignoff) {
          setExistingSignoff(foundSignoff);
          setStartDate(foundSignoff.startDate);
          setEndDate(foundSignoff.endDate);
          setIsCompleted(foundSignoff.isCompleted);
          setContractEntity(foundSignoff.contractEntity);
          setRevenueWithTax(foundSignoff.revenueWithTax.toString());
          setRevenueWithoutTax(foundSignoff.revenueWithoutTax.toString());
          setEstimatedCost(foundSignoff.estimatedCost.toString());
          setFirstPaymentDate(foundSignoff.firstPaymentDate);
          setFinalPaymentDate(foundSignoff.finalPaymentDate);
          setReceivedAmount(foundSignoff.receivedAmount.toString());
        }
      } else {
        toast.error('项目不存在');
        navigate('/projects');
      }
    }
  }, [projectId, navigate]);

  const handleSubmit = () => {
    if (!projectId || !project) return;

    if (!startDate) {
      toast.error('请选择项目开始时间');
      return;
    }
    if (!endDate) {
      toast.error('请选择项目结束时间');
      return;
    }
    if (!isCompleted) {
      toast.error('请选择是否完成');
      return;
    }
    if (!contractEntity) {
      toast.error('请选择签约公司主体');
      return;
    }

    const signoffData = {
      projectId,
      startDate,
      endDate,
      isCompleted,
      contractEntity,
      revenueWithTax: parseFloat(revenueWithTax) || 0,
      revenueWithoutTax: parseFloat(revenueWithoutTax) || 0,
      estimatedCost: parseFloat(estimatedCost) || 0,
      firstPaymentDate,
      finalPaymentDate,
      receivedAmount: parseFloat(receivedAmount) || 0,
    };

    if (existingSignoff) {
      signoffDB.update(existingSignoff.id, signoffData);
      toast.success('立项信息已更新');
    } else {
      signoffDB.create(signoffData);
      toast.success('立项信息已创建');
    }
    
    navigate('/signoffs');
  };

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/signoffs')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回立项列表
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {existingSignoff ? '编辑立项信息' : '新增立项信息'}
        </h1>
        <p className="mt-1 text-muted-foreground">项目：{project.projectName}</p>
      </div>

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            立项详情
          </CardTitle>
          <CardDescription>
            {existingSignoff
              ? `立项ID：${existingSignoff.id}`
              : '填写完成后系统将自动生成立项ID'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 项目信息（只读） */}
          <div className="rounded-lg bg-muted p-4">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">项目名称：</span>
                <span className="font-medium">{project.projectName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">客户：</span>
                <span className="font-medium">{project.shortName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">预估金额：</span>
                <span className="font-medium">¥{project.estimatedAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">BD：</span>
                <span className="font-medium">{project.bd}</span>
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">项目开始时间 *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">项目结束时间 *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>是否完成 *</Label>
              <Select value={isCompleted} onValueChange={setIsCompleted}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_STATUS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>签约公司主体 *</Label>
              <Select value={contractEntity} onValueChange={setContractEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_ENTITIES.map(entity => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 收入信息 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="revenueWithTax">含税收入（元）</Label>
              <Input
                id="revenueWithTax"
                type="number"
                placeholder="0"
                value={revenueWithTax}
                onChange={e => setRevenueWithTax(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenueWithoutTax">不含税收入（元）</Label>
              <Input
                id="revenueWithoutTax"
                type="number"
                placeholder="0"
                value={revenueWithoutTax}
                onChange={e => setRevenueWithoutTax(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">预估成本（元）</Label>
              <Input
                id="estimatedCost"
                type="number"
                placeholder="0"
                value={estimatedCost}
                onChange={e => setEstimatedCost(e.target.value)}
              />
            </div>
          </div>

          {/* 付款信息 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="firstPaymentDate">项目首款时间</Label>
              <Input
                id="firstPaymentDate"
                type="date"
                value={firstPaymentDate}
                onChange={e => setFirstPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalPaymentDate">项目尾款时间</Label>
              <Input
                id="finalPaymentDate"
                type="date"
                value={finalPaymentDate}
                onChange={e => setFinalPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivedAmount">已收金额（元）</Label>
              <Input
                id="receivedAmount"
                type="number"
                placeholder="0"
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => navigate('/signoffs')}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              {existingSignoff ? '保存更改' : '创建立项'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignoffForm;
