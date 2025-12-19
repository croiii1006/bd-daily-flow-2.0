import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerDB } from '@/data/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, AlertCircle, Building2 } from 'lucide-react';
import {
  CUSTOMER_TYPES,
  CUSTOMER_LEVELS,
  ANNUAL_CONTRACT_OPTIONS,
  INDUSTRIES,
  BD_LIST,
} from '@/data/options';
import type { Customer } from '@/types';

const steps = [
  { title: '基本信息', description: '输入企业信息' },
  { title: '验证检查', description: '检查是否已存在' },
  { title: '完善信息', description: '填写详细信息' },
];

const CustomerNew: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Step 1: 基本信息
  const [companyName, setCompanyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  
  // Step 2: 验证结果
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // Step 3: 详细信息
  const [shortName, setShortName] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [customerLevel, setCustomerLevel] = useState('');
  const [annualContract, setAnnualContract] = useState('');
  const [industry, setIndustry] = useState('');
  const [headquarterCity, setHeadquarterCity] = useState('');
  const [mainBD, setMainBD] = useState('');

  const handleStep1Next = async () => {
    if (!companyName.trim()) {
      toast.error('请输入企业名称');
      return;
    }
    if (!departmentName.trim()) {
      toast.error('请输入客户部门名称');
      return;
    }

    setIsChecking(true);
    
    // 模拟检查延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existing = customerDB.checkExists(companyName, departmentName);
    setExistingCustomer(existing || null);
    setIsChecking(false);
    setCurrentStep(1);
  };

  const handleStep2Next = () => {
    if (existingCustomer) {
      toast.error('该客户已存在，请直接编辑');
      return;
    }
    // 自动生成简称
    if (!shortName) {
      setShortName(companyName.slice(0, 4));
    }
    setCurrentStep(2);
  };

  const handleSubmit = () => {
    if (!shortName.trim()) {
      toast.error('请输入客户简称');
      return;
    }
    if (!customerType) {
      toast.error('请选择客户类型');
      return;
    }
    if (!customerLevel) {
      toast.error('请选择客户等级');
      return;
    }
    if (!annualContract) {
      toast.error('请选择是否年框客户');
      return;
    }
    if (!industry) {
      toast.error('请选择所属行业');
      return;
    }
    if (!headquarterCity.trim()) {
      toast.error('请输入总部城市');
      return;
    }
    if (!mainBD) {
      toast.error('请选择主 BD 负责人');
      return;
    }

    const newCustomer = customerDB.create({
      companyName,
      shortName,
      departmentName,
      customerType,
      customerLevel,
      annualContract,
      industry,
      headquarterCity,
      mainBD,
    });

    toast.success(`客户「${newCustomer.companyName}」创建成功`);
    navigate('/customers');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/customers')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回客户列表
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">新增客户</h1>
        <p className="mt-1 text-muted-foreground">按步骤填写客户信息</p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} className="mb-8" />

      <Card className="mx-auto max-w-2xl">
        {/* Step 1: 基本信息 */}
        {currentStep === 0 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>请输入客户的企业名称和部门名称</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">企业名称 *</Label>
                <Input
                  id="companyName"
                  placeholder="请输入企业全称"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentName">客户部门名称 *</Label>
                <Input
                  id="departmentName"
                  placeholder="请输入对接的部门名称"
                  value={departmentName}
                  onChange={e => setDepartmentName(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleStep1Next} disabled={isChecking}>
                  {isChecking ? '检查中...' : '下一步'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: 验证结果 */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle>验证结果</CardTitle>
              <CardDescription>系统已检查客户是否已存在</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingCustomer ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>客户已存在</AlertTitle>
                  <AlertDescription>
                    <p>该客户已在系统中录入：</p>
                    <ul className="mt-2 list-inside list-disc">
                      <li>企业名称：{existingCustomer.companyName}</li>
                      <li>客户简称：{existingCustomer.shortName}</li>
                      <li>客户部门：{existingCustomer.departmentName}</li>
                      <li>主 BD：{existingCustomer.mainBD}</li>
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate(`/customers/${existingCustomer.id}/edit`)}
                    >
                      前往编辑
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>验证通过</AlertTitle>
                  <AlertDescription>
                    该客户尚未在系统中录入，可以继续填写详细信息。
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  上一步
                </Button>
                <Button onClick={handleStep2Next} disabled={!!existingCustomer}>
                  下一步
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: 详细信息 */}
        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle>完善信息</CardTitle>
              <CardDescription>请填写客户的详细信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>企业名称</Label>
                  <Input value={companyName} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortName">客户简称 *</Label>
                  <Input
                    id="shortName"
                    placeholder="如：阿里、腾讯"
                    value={shortName}
                    onChange={e => setShortName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>客户类型 *</Label>
                  <Select value={customerType} onValueChange={setCustomerType}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>客户等级 *</Label>
                  <Select value={customerLevel} onValueChange={setCustomerLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>年框客户 *</Label>
                  <Select value={annualContract} onValueChange={setAnnualContract}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNUAL_CONTRACT_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>所属行业 *</Label>
                  <SearchableSelect
                    options={INDUSTRIES}
                    value={industry}
                    onChange={setIndustry}
                    placeholder="请选择行业"
                    searchPlaceholder="搜索行业..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="headquarterCity">总部城市 *</Label>
                  <Input
                    id="headquarterCity"
                    placeholder="如：北京、上海"
                    value={headquarterCity}
                    onChange={e => setHeadquarterCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>主 BD 负责人 *</Label>
                  <Select value={mainBD} onValueChange={setMainBD}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {BD_LIST.map(bd => (
                        <SelectItem key={bd} value={bd}>
                          {bd}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  上一步
                </Button>
                <Button onClick={handleSubmit}>
                  <Check className="mr-2 h-4 w-4" />
                  保存客户
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default CustomerNew;
